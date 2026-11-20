/**
 * Microbenchmark for `serializableMappingCache` hits and misses on clones that
 * hold a JS (non-worklet) function, against a control without one.
 *
 * Runs on mount and on "Run again". Every case prints one line to the console
 * (logcat tag `ReactNativeJS` on Android):
 *
 *     RNW_PERF {"case":"...","median_us":...,"p95_us":...,...}
 *
 * Preceded by one `RNW_PERF_META {...}` line and followed by one `RNW_PERF_DONE
 * {...}` line. The screen uses only public API, so it runs unchanged on builds
 * with and without the weak cache marker. `cache` in the meta line reports
 * which one is installed.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  createSerializable,
  runOnUISync,
  scheduleOnRN,
  scheduleOnUI,
  WorkletsModule,
} from 'react-native-worklets';

const TAG = 'RNW_PERF';

// Fast cases are timed in batches of BATCH calls, because one hit costs about
// as much as one `performance.now()` call. Each sample is batch time / BATCH.
const BATCH = 50;
const WARM_SAMPLES = 400;
const WARM_WARMUP_CALLS = 2000;
// Miss and after-GC cases need one distinct closure per sample.
const CLOSURES = 300;
const GC_ROUNDS = 3;
const ROUND_TRIP_WARMUP = 50;
const ROUND_TRIP_SAMPLES = 300;
const ROUND_TRIP_CLOSURES = 100;
// CopySerializablePerformanceTest defaults.
const COPY_OBJECTS = 1000;
const COPY_KEYS = 1000;
const COPY_RUNS = 5;

type Row = {
  case: string;
  n: number;
  median_us: number;
  p95_us: number;
  mean_us: number;
  min_us: number;
  max_us: number;
  [extra: string]: string | number;
};

type GlobalWithGc = { gc?: () => void };

function summarize(
  name: string,
  samplesMs: number[],
  extra: Record<string, string | number> = {}
): Row {
  const us = samplesMs.map((ms) => ms * 1000).sort((a, b) => a - b);
  const n = us.length;
  const at = (q: number) =>
    us[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))];
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    case: name,
    n,
    median_us: round(n % 2 ? us[(n - 1) / 2] : (us[n / 2 - 1] + us[n / 2]) / 2),
    p95_us: round(at(0.95)),
    mean_us: round(us.reduce((s, v) => s + v, 0) / n),
    min_us: round(us[0]),
    max_us: round(us[n - 1]),
    ...extra,
  };
}

function nextMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Collects garbage on the React Native runtime and on the UI runtime. Uses
 * `globalThis.gc` where the runtime has it. Without it, the RN runtime falls
 * back to allocation pressure until a sentinel `WeakRef` clears. Returns how it
 * collected, for the meta line.
 */
async function collectGarbage(): Promise<string> {
  // A `WeakRef` target survives until the end of the job that created or
  // dereferenced it, so leave the current job first.
  await nextMacrotask();
  const ui = runOnUISync(() => {
    'worklet';
    const uiGc = (globalThis as GlobalWithGc).gc;
    if (typeof uiGc === 'function') {
      uiGc();
      return 'gc';
    }
    return 'none';
  });
  let rn = 'none';
  const rnGc = (globalThis as GlobalWithGc).gc;
  if (typeof rnGc === 'function') {
    rnGc();
    // UI copies released by the UI collection can release RN objects too.
    await nextMacrotask();
    rnGc();
    rn = 'gc';
  } else if (typeof WeakRef === 'function') {
    let sentinel: object | null = {};
    const probe = new WeakRef(sentinel);
    sentinel = null;
    let rounds = 0;
    while (probe.deref() !== undefined && rounds < 100) {
      const junk: unknown[] = [];
      for (let i = 0; i < 100000; i++) {
        junk.push({ i });
      }
      rounds++;
      await nextMacrotask();
    }
    rn = probe.deref() === undefined ? `pressure(${rounds})` : 'failed';
  }
  await nextMacrotask();
  return `rn=${rn},ui=${ui}`;
}

// A plain JS function captured by a worklet. Serializing the worklet makes a
// remote function for it, which is what makes the clone "remote-bearing".
let pendingResolve: (() => void) | null = null;

function makeJsFunctionWorklet(i: number) {
  const onDone = (x: number) => {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve?.();
    return x + i;
  };
  return (x: number) => {
    'worklet';
    scheduleOnRN(onDone, x);
  };
}

function makePlainWorklet(i: number) {
  const offset = i;
  const scale = 2;
  return (x: number) => {
    'worklet';
    return x * scale + offset;
  };
}

/** Warm hit: a consumer keeps the first serializable alive. */
function measureWarmHit(name: string, worklet: object): Row {
  const keepAlive = createSerializable(worklet);
  for (let i = 0; i < WARM_WARMUP_CALLS; i++) {
    createSerializable(worklet);
  }
  const samples: number[] = [];
  for (let s = 0; s < WARM_SAMPLES; s++) {
    const t0 = performance.now();
    for (let i = 0; i < BATCH; i++) {
      createSerializable(worklet);
    }
    samples.push((performance.now() - t0) / BATCH);
  }
  const row = summarize(name, samples, { batch: BATCH });
  // Keep the consumer alive until the measurement is over.
  createSerializable(keepAlive);
  return row;
}

/**
 * One cold serialization per closure, then GC_ROUNDS rounds of: drop every
 * consumer, collect on both runtimes, serialize every closure again. Returns
 * the cold row and the after-GC row.
 */
async function measureAfterGc(
  name: string,
  coldName: string,
  closures: object[],
  gcLog: string[]
): Promise<Row[]> {
  const cold: number[] = [];
  const probes: WeakRef<object>[] = [];
  for (const closure of closures) {
    const t0 = performance.now();
    const ref = createSerializable(closure);
    cold.push(performance.now() - t0);
    probes.push(new WeakRef(ref as object));
  }
  const after: number[] = [];
  let released = 0;
  for (let round = 0; round < GC_ROUNDS; round++) {
    gcLog.push(await collectGarbage());
    released += probes.filter((p) => p.deref() === undefined).length;
    probes.length = 0;
    for (const closure of closures) {
      const t0 = performance.now();
      const ref = createSerializable(closure);
      after.push(performance.now() - t0);
      probes.push(new WeakRef(ref as object));
    }
  }
  return [
    summarize(coldName, cold),
    summarize(name, after, {
      // How many first-call serializables were collected before the next call:
      // `released` of `checked`. Expected 0 where the cache owns its clones.
      released,
      checked: closures.length * GC_ROUNDS,
    }),
  ];
}

function roundTrip(worklet: (x: number) => void): Promise<number> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    pendingResolve = () => resolve(performance.now() - t0);
    scheduleOnUI(worklet, 0);
  });
}

async function measureRoundTripSteady(): Promise<Row> {
  const worklet = makeJsFunctionWorklet(0);
  for (let i = 0; i < ROUND_TRIP_WARMUP; i++) {
    await roundTrip(worklet);
  }
  const samples: number[] = [];
  for (let i = 0; i < ROUND_TRIP_SAMPLES; i++) {
    samples.push(await roundTrip(worklet));
  }
  return summarize('c_scheduleOnUI_roundtrip_steady', samples);
}

/**
 * Round trip of a worklet whose previous serializable was dropped and
 * collected.
 */
async function measureRoundTripAfterGc(gcLog: string[]): Promise<Row> {
  const closures = Array.from({ length: ROUND_TRIP_CLOSURES }, (_, i) =>
    makeJsFunctionWorklet(1000 + i)
  );
  for (const closure of closures) {
    await roundTrip(closure);
  }
  const samples: number[] = [];
  for (let round = 0; round < GC_ROUNDS; round++) {
    gcLog.push(await collectGarbage());
    for (const closure of closures) {
      samples.push(await roundTrip(closure));
    }
  }
  return summarize('c2_scheduleOnUI_roundtrip_after_gc', samples);
}

function createRandomObject(numberOfKeys: number) {
  const obj: Record<string, number> = {};
  for (let i = 0; i < numberOfKeys; i++) {
    obj[`key${i}`] = Math.random();
  }
  return obj;
}

/** The case from CopySerializablePerformanceTest, on fresh objects every run. */
async function measureCopy(): Promise<Row> {
  const samples: number[] = [];
  for (let run = 0; run <= COPY_RUNS; run++) {
    const obj = Array.from({ length: COPY_OBJECTS }, () =>
      createRandomObject(COPY_KEYS)
    );
    const t0 = performance.now();
    createSerializable(obj);
    const elapsed = performance.now() - t0;
    if (run > 0) {
      // Run 0 is warm-up.
      samples.push(elapsed);
    }
    await nextMacrotask();
  }
  return summarize('e_copy_serializable_1000x1000', samples, {
    objects: COPY_OBJECTS,
    keys: COPY_KEYS,
  });
}

function cacheKind(): string {
  const module = WorkletsModule as unknown as Record<string, unknown>;
  return typeof module.makeWeakSerializableRef === 'function'
    ? 'weak-marker'
    : 'strong';
}

async function runAll(
  onRow: (row: Row) => void,
  onStatus: (s: string) => void
) {
  const started = performance.now();
  const gcLog: string[] = [];
  const emit = (row: Row) => {
    console.log(`${TAG} ${JSON.stringify(row)}`);
    onRow(row);
  };
  console.log(
    `${TAG}_META ${JSON.stringify({
      cache: cacheKind(),
      dev: __DEV__,
      rnGc: typeof (globalThis as GlobalWithGc).gc === 'function',
      weakRef: typeof WeakRef === 'function',
      batch: BATCH,
      closures: CLOSURES,
      gcRounds: GC_ROUNDS,
    })}`
  );

  onStatus('a: warm hit, JS function in closure');
  await nextMacrotask();
  emit(measureWarmHit('a_warm_hit_jsfn', makeJsFunctionWorklet(-1)));

  onStatus('b: after GC, JS function in closure');
  await nextMacrotask();
  for (const row of await measureAfterGc(
    'b_after_gc_jsfn',
    'b0_cold_jsfn',
    Array.from({ length: CLOSURES }, (_, i) => makeJsFunctionWorklet(i)),
    gcLog
  )) {
    emit(row);
  }

  onStatus('c: scheduleOnUI round trip, steady');
  emit(await measureRoundTripSteady());
  onStatus('c2: scheduleOnUI round trip after GC');
  emit(await measureRoundTripAfterGc(gcLog));

  onStatus('d: control, no JS function');
  await nextMacrotask();
  emit(measureWarmHit('d_warm_hit_plain', makePlainWorklet(-1)));
  for (const row of await measureAfterGc(
    'd_after_gc_plain',
    'd0_cold_plain',
    Array.from({ length: CLOSURES }, (_, i) => makePlainWorklet(i)),
    gcLog
  )) {
    emit(row);
  }

  onStatus('e: CopySerializablePerformanceTest case');
  emit(await measureCopy());

  const gc = [...new Set(gcLog)].join('|');
  console.log(
    `${TAG}_DONE ${JSON.stringify({
      cache: cacheKind(),
      gc,
      total_ms: Math.round(performance.now() - started),
    })}`
  );
  onStatus(`done (cache=${cacheKind()}, gc ${gc})`);
}

// Runs share module state (pendingResolve, the measured closures), so only one
// may be in flight across all mounted instances of this screen.
let runInProgress = false;

export default function SerializableCachePerformanceTest() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('starting');

  const start = useCallback(() => {
    if (runInProgress) {
      setStatus('another run is in progress');
      return;
    }
    runInProgress = true;
    setRows([]);
    runAll((row) => setRows((previous) => [...previous, row]), setStatus)
      .catch((error: unknown) => {
        console.log(`${TAG}_ERROR ${String(error)}`);
        setStatus(`error: ${String(error)}`);
      })
      .finally(() => {
        runInProgress = false;
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(start, 1000);
    return () => clearTimeout(timeout);
  }, [start]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.status} testID="rnw-perf-status">
        {status}
      </Text>
      <Button title="Run again" onPress={start} />
      <View style={styles.table}>
        {rows.map((row) => (
          <Text key={row.case} style={styles.row}>
            {row.case}: median {row.median_us.toFixed(2)} µs, p95{' '}
            {row.p95_us.toFixed(2)} µs (n={row.n})
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  status: {
    fontWeight: '700',
  },
  table: {
    gap: 6,
  },
  row: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
