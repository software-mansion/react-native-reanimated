import { ToolError } from './errors.mts';
import { quantileOrNull } from './frames.mts';
import { CPU_COUNTERS, footprintReadSpan } from './in-app-sample.mts';
import type {
  CpuCounter,
  EpochReading,
  EpochWork,
  InAppBoundary,
  InAppSample,
  SampledEpoch,
  TimeSpan,
} from './in-app-sample.mts';
import { kernelChargedTime } from './xctrace-metrics.mts';
import type {
  FootprintSample,
  OnCoreTime,
  TraceEpoch,
  TraceEpochSpans,
} from './xctrace-metrics.mts';

export interface BoundaryClock {
  id: number;
  appSignpostStartNs: number;
  appSignpostEndNs: number;
  traceNs: number;
  offsetNs: number;
}

export interface BoundaryClocks {
  unit: 'ns';
  boundaries: BoundaryClock[];
}

export interface ClockMapping {
  offsetNs: number;
  uncertaintyNs: number;
  spreadNs: number;
}

export interface Tolerance {
  absolute: number;
  relative: number;
}

export interface ComparedValue {
  app: number | null;
  trace: number | null;
  signedError: number | null;
  absoluteError: number | null;
  relativeError: number | null;
  timingUncertainty: number | null;
  tolerance: number | null;
  passes: boolean;
}

export interface WorkProof extends EpochWork {
  minimumOwn: number;
  maximumOther: number;
  passes: boolean;
}

export type CpuField = 'uiThreadCpu' | 'jsThreadCpu' | 'processCpu';

export interface CrosscheckEpoch extends SampledEpoch {
  index: number;
  windowSeconds: number;
  traceOnCore: Record<CpuField, OnCoreTime>;
  uiThreadCpu: ComparedValue;
  jsThreadCpu: ComparedValue;
  processCpu: ComparedValue;
  mountBatchCount: ComparedValue;
  workProof: WorkProof;
  updateCount: { app: number | null; trace: number };
  uiUpdateDurationMedian: ComparedValue | null;
  uiUpdateDurationP95: ComparedValue | null;
}

export interface FootprintComparison {
  boundary: number;
  app: number;
  read: TimeSpan;
  rows: FootprintSample[];
  low: number | null;
  high: number | null;
  signedError: number | null;
  tolerance: number | null;
  comparable: boolean;
  reason: string | null;
  passes: boolean;
}

export type MemoryOutcome = 'passed' | 'failed' | 'not available';

export interface CrosscheckTolerances {
  cpu: Tolerance;
  updateDuration: Tolerance;
  memory: Tolerance;
}

export interface CrosscheckVerdict {
  counters: boolean;
  loadsRan: boolean;
  memory: MemoryOutcome;
  updateDurationQuantilesWithinTolerance: boolean;
}

export const CPU_TOLERANCE: Tolerance = { absolute: 1, relative: 0.02 };

export const UPDATE_DURATION_TOLERANCE: Tolerance = {
  absolute: 0.25,
  relative: 0.05,
};

export const MEMORY_TOLERANCE: Tolerance = { absolute: 1024, relative: 0.02 };

export const CROSSCHECK_TOLERANCES: CrosscheckTolerances = {
  cpu: CPU_TOLERANCE,
  updateDuration: UPDATE_DURATION_TOLERANCE,
  memory: MEMORY_TOLERANCE,
};

export const WORK_LOADS = ['ui-stall', 'js-load', 'render-heavy'] as const;

const EXACT: Tolerance = { absolute: 0, relative: 0 };

const MAXIMUM_CLOCK_SPREAD_NS = 1_000_000;

const MINIMUM_OWN_WORK_SHARE = 0.5;

const MAXIMUM_OTHER_WORK_SHARE = 0.1;

const MAXIMUM_FOOTPRINT_ROWS_NS = 2_000_000_000;

const MINIMUM_FOOTPRINT_COMPARISONS = 2;

const NANOSECONDS_PER_MS = 1e6;

const CPU_FIELDS: Record<CpuCounter, CpuField> = {
  uiThread: 'uiThreadCpu',
  jsThread: 'jsThreadCpu',
  process: 'processCpu',
};

export function boundaryClocks(
  boundaries: readonly Pick<
    InAppBoundary,
    'signpostStartNs' | 'signpostEndNs'
  >[],
  traceNs: readonly number[]
): BoundaryClocks {
  if (traceNs.length !== boundaries.length) {
    throw new ToolError(
      `The trace has ${traceNs.length} Boundary signposts of the app, and its SAMPLE line has ${boundaries.length} boundaries`
    );
  }
  return {
    unit: 'ns',
    boundaries: boundaries.map((boundary, id) => ({
      id,
      appSignpostStartNs: boundary.signpostStartNs,
      appSignpostEndNs: boundary.signpostEndNs,
      traceNs: traceNs[id],
      offsetNs: boundaryOffset(
        boundary.signpostStartNs,
        boundary.signpostEndNs,
        traceNs[id]
      ),
    })),
  };
}

export function mapAppClock({ boundaries }: BoundaryClocks): ClockMapping {
  const offsets = boundaries
    .map(({ offsetNs }) => offsetNs)
    .sort((left, right) => left - right);
  const spreadNs = offsets[offsets.length - 1] - offsets[0];
  if (spreadNs > MAXIMUM_CLOCK_SPREAD_NS) {
    throw new ToolError(
      `The clock of the app and the clock of the trace differ by ${spreadNs} ns between the Boundary signposts, more than ${MAXIMUM_CLOCK_SPREAD_NS} ns`
    );
  }
  const offsetNs = offsets[Math.floor(offsets.length / 2)];
  return {
    offsetNs,
    uncertaintyNs: Math.max(
      ...boundaries.map(
        (boundary) =>
          Math.abs(boundary.offsetNs - offsetNs) +
          (boundary.appSignpostEndNs - boundary.appSignpostStartNs) / 2
      )
    ),
    spreadNs,
  };
}

export function clockProblems(
  clocks: BoundaryClocks,
  mapping: ClockMapping
): string[] {
  const problems = clocks.boundaries.flatMap((boundary, i) => {
    const offsetNs = boundaryOffset(
      boundary.appSignpostStartNs,
      boundary.appSignpostEndNs,
      boundary.traceNs
    );
    return [
      ...(boundary.id === i ? [] : [`boundary ${i} has the id ${boundary.id}`]),
      ...(offsetNs === boundary.offsetNs
        ? []
        : [
            `boundary ${boundary.id}: the stored offset ${boundary.offsetNs} ns is not the trace time minus the middle of the app signpost (${offsetNs} ns)`,
          ]),
      ...(Math.abs(offsetNs - mapping.offsetNs) <= mapping.uncertaintyNs
        ? []
        : [
            `boundary ${boundary.id}: its offset ${offsetNs} ns differs from the mapping (${mapping.offsetNs} ns) by more than its uncertainty (${mapping.uncertaintyNs} ns)`,
          ]),
    ];
  });
  let recomputed: ClockMapping | null = null;
  try {
    recomputed = mapAppClock({
      unit: clocks.unit,
      boundaries: clocks.boundaries.map((boundary) => ({
        ...boundary,
        offsetNs: boundaryOffset(
          boundary.appSignpostStartNs,
          boundary.appSignpostEndNs,
          boundary.traceNs
        ),
      })),
    });
  } catch (error) {
    return [...problems, (error as Error).message];
  }
  return isSameMapping(recomputed, mapping)
    ? problems
    : [
        ...problems,
        `the clock mapping (offset ${mapping.offsetNs} ns, uncertainty ${mapping.uncertaintyNs} ns, spread ${mapping.spreadNs} ns) does not follow from the boundary times (offset ${recomputed.offsetNs} ns, uncertainty ${recomputed.uncertaintyNs} ns, spread ${recomputed.spreadNs} ns)`,
      ];
}

export function traceSpans(
  readings: readonly EpochReading[],
  { offsetNs }: ClockMapping
): TraceEpochSpans[] {
  const moved = (span: TimeSpan): TimeSpan => ({
    startNs: span.startNs + offsetNs,
    endNs: span.endNs + offsetNs,
  });
  return readings.map((reading) => ({
    window: moved(reading.window),
    counters: {
      uiThread: moved(reading.counterSpans.uiThread),
      jsThread: moved(reading.counterSpans.jsThread),
      process: moved(reading.counterSpans.process),
    },
  }));
}

export function compareEpochs(
  epochs: readonly SampledEpoch[],
  readings: readonly EpochReading[],
  traced: readonly TraceEpoch[],
  clock: ClockMapping,
  refreshRate: number
): CrosscheckEpoch[] {
  return epochs.map((epoch, index) => {
    const reading = readings[index];
    const trace = traced[index];
    const durations = reading.updates?.durationsMs ?? null;
    const durationValue = (q: number) =>
      durations === null
        ? null
        : compared(
            quantileOrNull(durations, q),
            quantileOrNull(trace.frameDurationsMs, q),
            UPDATE_DURATION_TOLERANCE
          );
    const cpuValue = (counter: CpuCounter) =>
      compared(
        reading.cpu[CPU_FIELDS[counter]],
        trace[CPU_FIELDS[counter]],
        CPU_TOLERANCE,
        reading.cpuUncertainty[counter] +
          (2 * clock.uncertaintyNs * reading.counterCores[counter]) /
            NANOSECONDS_PER_MS /
            spanSeconds(reading.counterSpans[counter])
      );
    return {
      ...epoch,
      index,
      windowSeconds: reading.window.seconds,
      traceOnCore: {
        uiThreadCpu: trace.onCore.uiThread,
        jsThreadCpu: trace.onCore.jsThread,
        processCpu: trace.onCore.process,
      },
      uiThreadCpu: cpuValue('uiThread'),
      jsThreadCpu: cpuValue('jsThread'),
      processCpu: cpuValue('process'),
      mountBatchCount: compared(
        reading.mountBatchCount,
        trace.mountBatchCount,
        EXACT
      ),
      workProof: workProof(
        epoch.load,
        epoch.work,
        refreshRate * reading.window.seconds
      ),
      updateCount: {
        app: durations?.length ?? null,
        trace: trace.frameDurationsMs.length,
      },
      uiUpdateDurationMedian: durationValue(0.5),
      uiUpdateDurationP95: durationValue(0.95),
    };
  });
}

export function compareFootprints(
  sample: InAppSample,
  footprints: readonly FootprintSample[],
  clock: ClockMapping
): FootprintComparison[] {
  const rows = [...footprints].sort(
    (left, right) => left.startNs - right.startNs
  );
  return sample.boundaries.map((boundary, index) => {
    const span = footprintReadSpan(boundary);
    const read = {
      startNs: span.startNs + clock.offsetNs - clock.uncertaintyNs,
      endNs: span.endNs + clock.offsetNs + clock.uncertaintyNs,
    };
    return judgeFootprint(
      index,
      boundary.footprintKb,
      read,
      rowsAroundRead(rows, read)
    );
  });
}

export function rederivedEpoch(
  epoch: CrosscheckEpoch,
  refreshRate: number
): CrosscheckEpoch {
  const again = (value: ComparedValue, tolerance: Tolerance) =>
    compared(value.app, value.trace, tolerance, value.timingUncertainty);
  const cpu = (field: CpuField) =>
    compared(
      epoch[field].app,
      kernelChargedTime(epoch.traceOnCore[field]),
      CPU_TOLERANCE,
      epoch[field].timingUncertainty
    );
  const duration = (value: ComparedValue | null) =>
    value === null ? null : again(value, UPDATE_DURATION_TOLERANCE);
  return {
    ...epoch,
    uiThreadCpu: cpu('uiThreadCpu'),
    jsThreadCpu: cpu('jsThreadCpu'),
    processCpu: cpu('processCpu'),
    mountBatchCount: again(epoch.mountBatchCount, EXACT),
    workProof: workProof(
      epoch.load,
      epoch.work,
      refreshRate * epoch.windowSeconds
    ),
    uiUpdateDurationMedian: duration(epoch.uiUpdateDurationMedian),
    uiUpdateDurationP95: duration(epoch.uiUpdateDurationP95),
  };
}

export function rederivedFootprint(
  comparison: FootprintComparison
): FootprintComparison {
  return judgeFootprint(
    comparison.boundary,
    comparison.app,
    comparison.read,
    comparison.rows
  );
}

export function crosscheckVerdict(
  epochs: readonly CrosscheckEpoch[],
  footprints: readonly FootprintComparison[]
): CrosscheckVerdict {
  const durations = epochs.flatMap((epoch) =>
    [epoch.uiUpdateDurationMedian, epoch.uiUpdateDurationP95].filter(
      (value) => value !== null
    )
  );
  return {
    counters: epochs.every(
      (epoch) =>
        CPU_COUNTERS.every((counter) => epoch[CPU_FIELDS[counter]].passes) &&
        epoch.mountBatchCount.passes
    ),
    loadsRan: epochs.every((epoch) => epoch.workProof.passes),
    memory: memoryOutcome(footprints),
    updateDurationQuantilesWithinTolerance:
      durations.length > 0 && durations.every((value) => value.passes),
  };
}

function workProof(
  load: string,
  work: EpochWork,
  displaySlots: number
): WorkProof {
  const hasWorkUnits = (WORK_LOADS as readonly string[]).includes(load);
  const minimumOwn = hasWorkUnits ? MINIMUM_OWN_WORK_SHARE * displaySlots : 0;
  const maximumOther = MAXIMUM_OTHER_WORK_SHARE * displaySlots;
  return {
    own: work.own,
    other: work.other,
    minimumOwn,
    maximumOther,
    passes: work.own >= minimumOwn && work.other <= maximumOther,
  };
}

function rowsAroundRead(
  rows: readonly FootprintSample[],
  read: TimeSpan
): FootprintSample[] {
  const before = rows.findLastIndex((row) => row.endNs <= read.startNs);
  const after = rows.findIndex((row) => row.startNs >= read.endNs);
  return before === -1 || after === -1 ? [] : rows.slice(before, after + 1);
}

function judgeFootprint(
  boundary: number,
  app: number,
  read: TimeSpan,
  rows: FootprintSample[]
): FootprintComparison {
  const notComparable = (reason: string) => ({
    boundary,
    app,
    read,
    rows,
    low: null,
    high: null,
    signedError: null,
    tolerance: null,
    comparable: false,
    reason,
    passes: false,
  });
  if (rows.length === 0) {
    return notComparable(
      'Activity Monitor has no row that ends before the read or no row that starts after it'
    );
  }
  if (!areRowsAroundRead(rows, read)) {
    return notComparable(
      'the rows are not the rows from the last row that ends before the read to the first row that starts after it'
    );
  }
  const spanNs = Math.max(...rows.map((row) => row.endNs)) - rows[0].startNs;
  if (spanNs > MAXIMUM_FOOTPRINT_ROWS_NS) {
    return notComparable(
      `the Activity Monitor rows around the read cover ${spanNs / NANOSECONDS_PER_MS} ms, more than ${MAXIMUM_FOOTPRINT_ROWS_NS / NANOSECONDS_PER_MS} ms`
    );
  }
  const values = rows.map((row) => row.footprintKb);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const tolerance = Math.max(
    MEMORY_TOLERANCE.absolute,
    MEMORY_TOLERANCE.relative * high
  );
  if (high - low >= tolerance) {
    return notComparable(
      `the Activity Monitor rows around the read differ by ${high - low} kB, not less than the tolerance of ${tolerance} kB`
    );
  }
  const signedError = app < low ? app - low : app > high ? app - high : 0;
  return {
    boundary,
    app,
    read,
    rows,
    low,
    high,
    signedError,
    tolerance,
    comparable: true,
    reason: null,
    passes: Math.abs(signedError) <= tolerance,
  };
}

function areRowsAroundRead(
  rows: readonly FootprintSample[],
  read: TimeSpan
): boolean {
  const last = rows.length - 1;
  return (
    rows.length >= 2 &&
    rows.every(
      (row, i) =>
        (i === 0 || row.startNs >= rows[i - 1].startNs) &&
        (i === 0) === row.endNs <= read.startNs &&
        (i === last) === row.startNs >= read.endNs
    )
  );
}

function memoryOutcome(
  footprints: readonly FootprintComparison[]
): MemoryOutcome {
  const comparable = footprints.filter((value) => value.comparable);
  if (comparable.length < MINIMUM_FOOTPRINT_COMPARISONS) {
    return 'not available';
  }
  return comparable.every((value) => value.passes) ? 'passed' : 'failed';
}

function compared(
  app: number | null,
  trace: number | null,
  tolerance: Tolerance,
  timingUncertainty: number | null = null
): ComparedValue {
  if (app === null || trace === null) {
    return {
      app,
      trace,
      signedError: null,
      absoluteError: null,
      relativeError: null,
      timingUncertainty,
      tolerance: null,
      passes: false,
    };
  }
  const signedError = app - trace;
  const allowed =
    Math.max(tolerance.absolute, tolerance.relative * Math.abs(trace)) +
    (timingUncertainty ?? 0);
  return {
    app,
    trace,
    signedError,
    absoluteError: Math.abs(signedError),
    relativeError: trace === 0 ? null : signedError / trace,
    timingUncertainty,
    tolerance: allowed,
    passes: Math.abs(signedError) <= allowed,
  };
}

function boundaryOffset(
  appSignpostStartNs: number,
  appSignpostEndNs: number,
  traceNs: number
): number {
  return traceNs - (appSignpostStartNs + appSignpostEndNs) / 2;
}

function isSameMapping(left: ClockMapping, right: ClockMapping): boolean {
  return (
    left.offsetNs === right.offsetNs &&
    left.uncertaintyNs === right.uncertaintyNs &&
    left.spreadNs === right.spreadNs
  );
}

function spanSeconds(span: TimeSpan): number {
  return (span.endNs - span.startNs) / 1e9;
}
