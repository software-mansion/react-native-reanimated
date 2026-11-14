import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { TraceProcessor, traceConfig } from '../perfetto.mts';
import type { TracedApp, TraceMetrics, TraceReading } from '../perfetto.mts';
import type { Processes } from '../processes.mts';

// Cut of the output of trace_processor_shell v59.1 for a mount-unmount trace on
// a Samsung Galaxy A16. The running and clock rate sets have only the rows of the
// main thread.
const OUTPUT = fs.readFileSync(
  path.join(import.meta.dirname, 'fixtures', 'trace-processor-output.csv'),
  'utf8'
);
const SETS = OUTPUT.trimEnd().split('\n\n');
const SUMMARY_ROW = '9877724001,1,0,1,592';
const SECONDS = 9.877724001;
const APP: TracedApp = {
  applicationId: 'com.reanimatedbenchmark.b',
  pid: 2539,
  jsThread: 2573,
};
const RUNNING_HEADER = '"role","start_ts","end_ts","cpu"';
const FREQUENCY_HEADER = '"cpu","start_ts","end_ts","khz"';
const FRAME_HEADER = '"ts","dur","complete"';

interface Collected {
  reading: TraceReading;
  query: string;
  args: string[];
}

async function collect(
  output = OUTPUT,
  app = APP,
  refreshRate = 60
): Promise<Collected> {
  let query = '';
  let args: string[] = [];
  const processes = {
    run: async (
      _binary: string,
      runArgs: string[],
      options: { input: string }
    ) => {
      query = options.input;
      args = runArgs;
      return { stdout: output, stderr: '' };
    },
  } as unknown as Processes;
  const reading = await new TraceProcessor(processes, '/tp').collect(
    '/runs/a.perfetto-trace',
    app,
    { refreshRate, share: 1 }
  );
  return { reading, query, args };
}

async function metricsOf(output = OUTPUT, refreshRate = 60) {
  const { reading } = await collect(output, APP, refreshRate);
  assert.equal(reading.processLived, true);
  return reading.processLived ? reading.metrics : assert.fail();
}

function assertClose(actual: number | null, expected: number) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) < 1e-6,
    `${actual} is not ${expected}`
  );
}

function withSet(index: number, lines: string[]): string {
  const sets = [...SETS];
  sets[index] = lines.join('\n');
  return `${sets.join('\n\n')}\n`;
}

function withSummary(row: string): string {
  return OUTPUT.replace(SUMMARY_ROW, row);
}

function withWork(running: string[], frequencies: string[], frames: string[]) {
  const sets = [...SETS];
  sets[2] = [RUNNING_HEADER, ...running].join('\n');
  sets[3] = [FREQUENCY_HEADER, ...frequencies].join('\n');
  sets[5] = [FRAME_HEADER, ...frames].join('\n');
  return `${sets.join('\n\n')}\n`;
}

describe('TraceProcessor.collect', () => {
  it('runs the metrics query on the trace', async () => {
    const { args, query } = await collect();
    assert.deepEqual(args, [
      'query',
      '--no-agent',
      '--format',
      'csv',
      '--quiet',
      '-f',
      '-',
      '/runs/a.perfetto-trace',
    ]);
    assert.ok(
      query.includes("WHERE pid = 2539 AND name = 'com.reanimatedbenchmark.b'")
    );
  });

  it('computes all metrics from the output of a real trace', async () => {
    const metrics = await metricsOf();
    assert.equal(metrics.frameCount, 591);
    assertClose(metrics.expectedFrameCount, 60 * SECONDS);
    assertClose(metrics.jankyFrames, 1 - 591 / (60 * SECONDS));
    assertClose(metrics.frameDurationMedian, 6.550462);
    assertClose(metrics.frameDurationP95, 13.150461);
    assertClose(metrics.drawFrameMedian, 8.980923);
    assertClose(metrics.drawFrameP95, 15.8924308);
    assert.equal(metrics.frameTimelineFrameCount, 577);
    assertClose(metrics.frameTimelineDurationMedian, 16.601615);
    assertClose(metrics.jankFlaggedFrames, 575 / 577);
    assertClose(metrics.appDeadlineMissedFrames, 10 / 577);
    assertClose(metrics.uiThreadCpu, 463.363944015507);
    assertClose(metrics.jsThreadCpu, 64.866679503814);
    assertClose(metrics.renderThreadCpu, 394.939209741541);
    assertClose(metrics.otherThreadsCpu, 294.438554337574);
    assertClose(metrics.processCpu, 1217.608387598437);
    assert.equal(metrics.mountBatchCount, 582);
    assert.equal(metrics.memory, 152448);
    assert.equal(metrics.windowMemoryDelta, -1508);
  });

  it('gives the work values of the Perfetto standard library from the scheduling slices and the clock rates', async () => {
    const metrics = await metricsOf();
    assertClose(metrics.uiThreadCpuWork, 601106.2810622056);
    assertClose(metrics.processCpuWork, 601106.2810622056);
    assertClose(metrics.frameCyclesMedian, 7.0240723);
    assertClose(metrics.frameCyclesP95, 14.61877335);
    assertClose(metrics.frameCyclesCoverage, 0.9984005588953065);
  });

  it('gives the share of dropped frames from the refresh rate, and 0 when the app draws more frames', async () => {
    const at90 = await metricsOf(OUTPUT, 90);
    assertClose(at90.expectedFrameCount, 90 * SECONDS);
    assertClose(at90.jankyFrames, 1 - 591 / (90 * SECONDS));
    assert.equal((await metricsOf(OUTPUT, 30)).jankyFrames, 0);
  });

  it('divides the CPU time by the length of the trace window', async () => {
    const half = await metricsOf(withSummary('4938862000,1,0,1,592'));
    assertClose(half.uiThreadCpu, (463.363944015507 * SECONDS) / 4.938862);
  });

  it('gives a crash when the launched process ended before the window end', async () => {
    for (const summary of ['9877724001,1,1,1,592', '9877724001,2,1,1,592']) {
      assert.deepEqual((await collect(withSummary(summary))).reading, {
        processLived: false,
        detail: 'the app process 2539 ended before the end of the trace',
      });
    }
  });

  it('stops when the trace lost data', async () => {
    await assert.rejects(
      collect(`${OUTPUT.trimEnd()}\n"ftrace_cpu_overrun_end",0,12\n`),
      /ftrace_cpu_overrun_end\[0\] = 12/
    );
  });

  it('stops when the launched process is absent or has no JS thread with the id of the READY line', async () => {
    await assert.rejects(
      collect(withSummary('9877724001,0,0,1,592')),
      /no process com.reanimatedbenchmark.b with pid 2539/
    );
    await assert.rejects(
      collect(withSummary('9877724001,1,0,0,592')),
      /no thread "mqt_v_js" with the jsThread 2573 of the READY line/
    );
  });

  it('stops when no thread of the trace has a Choreographer#doFrame slice', async () => {
    const sets = withSummary('9877724001,1,0,1,0').split('\n\n');
    sets[5] = FRAME_HEADER;
    await assert.rejects(
      collect(`${sets.join('\n\n')}\n`),
      /no Choreographer#doFrame% slice on any thread\. The atrace category "view" gave no data/
    );
  });

  it('gives 0 frames and null frame values when only other threads have a Choreographer#doFrame slice', async () => {
    const metrics = await metricsOf(withSet(5, [FRAME_HEADER]));
    assert.equal(metrics.frameCount, 0);
    assert.equal(metrics.jankyFrames, 1);
    assert.equal(metrics.frameDurationMedian, null);
    assert.equal(metrics.frameDurationP99, null);
    assert.equal(metrics.frameCyclesMedian, null);
    assert.equal(metrics.frameCyclesCoverage, null);
  });

  it('gives null for the stored frame timeline and DrawFrame metrics when they have no rows', async () => {
    const sets = [...SETS];
    sets[4] = sets[4].split('\n')[0];
    sets[6] = '"dur"';
    const metrics = await metricsOf(`${sets.join('\n\n')}\n`);
    assert.equal(metrics.frameTimelineFrameCount, 0);
    assert.equal(metrics.frameTimelineDurationMedian, null);
    assert.equal(metrics.jankFlaggedFrames, null);
    assert.equal(metrics.drawFrameMedian, null);
    assert.equal(metrics.frameCount, 591);
  });

  it('stops when the trace window is empty', async () => {
    await assert.rejects(
      collect(withSummary('0,1,0,1,592')),
      /trace window is 0 ns long/
    );
  });
});

describe('estimated cycles of each frame', () => {
  const main = (start: number, end: number, cpu: number) =>
    `"main",${start},${end},${cpu}`;
  const frequency = (cpu: number, start: number, end: number, khz: number) =>
    `${cpu},${start},${end},${khz}`;
  const frame = (ts: number, dur: number, complete = 1) =>
    `${ts},${dur},${complete}`;

  it('sums the running time of the main thread in each frame times the clock rate', async () => {
    const metrics: TraceMetrics = await metricsOf(
      withWork(
        [main(1_000, 3_000, 0), main(10_000, 12_000, 0)],
        [frequency(0, 0, 20_000, 2_000_000)],
        [frame(0, 5_000), frame(9_000, 4_000)]
      )
    );
    assertClose(metrics.frameCyclesMedian, 0.004);
    assertClose(metrics.frameCyclesP95, 0.004);
    assert.equal(metrics.frameCyclesCoverage, 1);
    assertClose(metrics.uiThreadCpuWork, 8 / SECONDS);
  });

  it('gives null when less than 95% of the running time has a known clock rate', async () => {
    const work = (frequencyStart: number) =>
      metricsOf(
        withWork(
          [main(1_000, 21_000, 0)],
          [frequency(0, frequencyStart, 30_000, 1_000_000)],
          [frame(0, 30_000)]
        )
      );
    const gap = await work(2_001);
    assertClose(gap.frameCyclesCoverage, 18_999 / 20_000);
    assert.equal(gap.frameCyclesMedian, null);
    assert.equal(gap.frameCyclesP95, null);
    assertClose(gap.uiThreadCpuWork, 18.999 / SECONDS);
    const edge = await work(2_000);
    assertClose(edge.frameCyclesCoverage, 0.95);
    assertClose(edge.frameCyclesMedian, 0.019);
  });

  it('splits a frame at a change of the clock rate', async () => {
    const metrics = await metricsOf(
      withWork(
        [main(0, 4_000, 0)],
        [
          frequency(0, 0, 1_000, 1_000_000),
          frequency(0, 1_000, 4_000, 3_000_000),
        ],
        [frame(0, 4_000)]
      )
    );
    assertClose(metrics.frameCyclesMedian, (1_000 * 1 + 3_000 * 3) / 1e6);
  });

  it('uses the clock rate of the core that the main thread runs on after a migration', async () => {
    const metrics = await metricsOf(
      withWork(
        [main(0, 2_000, 1), main(2_000, 5_000, 6)],
        [frequency(1, 0, 5_000, 500_000), frequency(6, 0, 5_000, 2_000_000)],
        [frame(0, 5_000)]
      )
    );
    assertClose(metrics.frameCyclesMedian, (2_000 * 0.5 + 3_000 * 2) / 1e6);
  });

  it('uses only the complete frames', async () => {
    const metrics = await metricsOf(
      withWork(
        [main(0, 10_000, 0)],
        [frequency(0, 0, 10_000, 1_000_000)],
        [frame(0, 1_000), frame(5_000, 5_000, 0)]
      )
    );
    assertClose(metrics.frameCyclesMedian, 0.001);
    assertClose(metrics.frameCyclesP95, 0.001);
  });

  it('gives null work when no running time has a known clock rate', async () => {
    const metrics = await metricsOf(
      withWork([main(0, 1_000, 0)], [], [frame(0, 1_000)])
    );
    assert.equal(metrics.uiThreadCpuWork, null);
    assert.equal(metrics.processCpuWork, null);
    assert.equal(metrics.frameCyclesCoverage, 0);
    assert.equal(metrics.frameCyclesMedian, null);
  });
});

describe('trace config and query', () => {
  const queryOf = async (app: TracedApp) => (await collect(OUTPUT, app)).query;

  it('names the data sources and the app', () => {
    const config = traceConfig('com.reanimatedbenchmark.a');
    for (const expected of [
      'name: "android.surfaceflinger.frametimeline"',
      'ftrace_events: "sched/sched_switch"',
      'ftrace_events: "sched/sched_process_free"',
      'ftrace_events: "task/task_rename"',
      'ftrace_events: "power/cpu_frequency"',
      'name: "linux.sys_stats"',
      'cpufreq_period_ms: 1000',
      'atrace_categories: "gfx"',
      'atrace_apps: "com.reanimatedbenchmark.a"',
      'scan_all_processes_on_start: true',
      'proc_stats_poll_ms: 1000',
      'duration_ms: 10000',
    ]) {
      assert.ok(config.includes(expected), expected);
    }
  });

  it('selects the launched process by pid and name in each query', async () => {
    const query = await queryOf({ ...APP, pid: 4321 });
    const selection = "WHERE pid = 4321 AND name = 'com.reanimatedbenchmark.b'";
    assert.equal(query.split(selection).length - 1, 8);
    assert.equal(query.split('FROM process').length - 1, 8);
  });

  it('gives the JS role only to the thread of the READY line', async () => {
    const query = await queryOf(APP);
    assert.ok(query.includes("WHEN thread.tid = 2573 THEN 'js'"));
    assert.ok(!query.includes("thread.name = 'mqt_v_js' THEN"));
    assert.ok(
      query.includes("WHERE role = 'js' AND name = 'mqt_v_js') AS js_threads")
    );
  });

  it('reads the closed scheduling slices and the clock rate intervals cut to the trace window', async () => {
    const query = await queryOf(APP);
    assert.ok(
      query.includes(
        'MAX(sched.ts, trace_window.start_ts) AS start_ts,\n  MIN(sched.ts + sched.dur, trace_window.end_ts) AS end_ts,\n  sched.cpu'
      )
    );
    assert.ok(query.includes('WHERE sched.dur > 0'));
    assert.ok(
      query.includes(
        'LEAD(counter.ts, 1, (SELECT end_ts FROM trace_bounds)) OVER (PARTITION BY cpu_counter_track.cpu ORDER BY counter.ts) AS end_ts'
      )
    );
    assert.ok(query.includes("WHERE cpu_counter_track.name = 'cpufreq'"));
  });

  it('marks the frames that end in the trace window', async () => {
    assert.ok(
      (await queryOf(APP)).includes(
        'thread_slice.ts + thread_slice.dur <= trace_window.end_ts AS complete'
      )
    );
  });

  it('counts the mount batches of the app process in the trace window', async () => {
    assert.ok(
      (await queryOf(APP)).includes(
        "SELECT COUNT(*) AS mount_batches FROM thread_slice\nWHERE name = 'IntBufferBatchMountItem::mountViews';"
      )
    );
  });

  it('clips the CPU time to the trace window and ends unfinished slices at the window end', async () => {
    const query = await queryOf(APP);
    assert.ok(
      query.includes(
        'IIF(sched.dur = -1, trace_window.end_ts, MIN(sched.ts + sched.dur, trace_window.end_ts))'
      )
    );
    assert.ok(query.includes('- MAX(sched.ts, trace_window.start_ts)'));
    assert.ok(
      query.includes(
        '(SELECT end_ts - start_ts FROM trace_window) AS window_ns'
      )
    );
    assert.ok(query.includes('AND ts >= trace_window.start_ts'));
  });

  it('rejects an application id, a pid or a JS thread id that is not safe in SQL', async () => {
    await assert.rejects(
      queryOf({ applicationId: "com.x' OR 1=1 --", pid: 1, jsThread: 2 }),
      /not a valid application id/
    );
    await assert.rejects(
      queryOf({ applicationId: 'com.x', pid: 1.5, jsThread: 2 }),
      /not a valid process id/
    );
    await assert.rejects(
      queryOf({ applicationId: 'com.x', pid: 1, jsThread: 0 }),
      /not a valid thread id/
    );
  });
});
