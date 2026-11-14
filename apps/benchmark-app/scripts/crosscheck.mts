import { ToolError } from './errors.mts';
import { quantileOrNull } from './frames.mts';
import { CPU_COUNTERS, footprintReadSpan } from './in-app-sample.mts';
import type {
  CpuCounter,
  EpochReading,
  EpochWork,
  InAppSample,
  SampledEpoch,
  TimeSpan,
} from './in-app-sample.mts';
import type {
  FootprintSample,
  TraceEpoch,
  TraceEpochSpans,
} from './xctrace-metrics.mts';

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

export interface CrosscheckEpoch extends SampledEpoch {
  index: number;
  windowSeconds: number;
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

export const WORK_LOADS = ['ui-stall', 'js-load', 'render-heavy'] as const;

const EXACT: Tolerance = { absolute: 0, relative: 0 };

const MAXIMUM_CLOCK_SPREAD_NS = 1_000_000;

const MINIMUM_OWN_WORK_SHARE = 0.5;

const MAXIMUM_OTHER_WORK_SHARE = 0.1;

const MAXIMUM_FOOTPRINT_ROWS_NS = 2_000_000_000;

const MINIMUM_FOOTPRINT_COMPARISONS = 2;

const NANOSECONDS_PER_MS = 1e6;

const CPU_FIELDS: Record<
  CpuCounter,
  'uiThreadCpu' | 'jsThreadCpu' | 'processCpu'
> = {
  uiThread: 'uiThreadCpu',
  jsThread: 'jsThreadCpu',
  process: 'processCpu',
};

export function mapAppClock(
  sample: InAppSample,
  boundaryTraceNs: readonly number[]
): ClockMapping {
  if (boundaryTraceNs.length !== sample.boundaries.length) {
    throw new ToolError(
      `The trace has ${boundaryTraceNs.length} Boundary signposts of the app, and its SAMPLE line has ${sample.boundaries.length} boundaries`
    );
  }
  const estimates = sample.boundaries.map((boundary, i) => ({
    offsetNs:
      boundaryTraceNs[i] -
      (boundary.signpostStartNs + boundary.signpostEndNs) / 2,
    halfWidthNs: (boundary.signpostEndNs - boundary.signpostStartNs) / 2,
  }));
  const offsets = estimates
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
      ...estimates.map(
        (estimate) =>
          Math.abs(estimate.offsetNs - offsetNs) + estimate.halfWidthNs
      )
    ),
    spreadNs,
  };
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
      uiThreadCpu: cpuValue('uiThread'),
      jsThreadCpu: cpuValue('jsThread'),
      processCpu: cpuValue('process'),
      mountBatchCount: compared(
        reading.mountBatchCount,
        trace.mountBatchCount,
        EXACT
      ),
      workProof: workProof(epoch, refreshRate * reading.window.seconds),
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
    return footprintComparison(
      index,
      boundary.footprintKb,
      {
        startNs: span.startNs + clock.offsetNs - clock.uncertaintyNs,
        endNs: span.endNs + clock.offsetNs + clock.uncertaintyNs,
      },
      rows
    );
  });
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

function workProof(epoch: SampledEpoch, displaySlots: number): WorkProof {
  const { work } = epoch;
  const hasWorkUnits = (WORK_LOADS as readonly string[]).includes(epoch.load);
  const minimumOwn = hasWorkUnits ? MINIMUM_OWN_WORK_SHARE * displaySlots : 0;
  const maximumOther = MAXIMUM_OTHER_WORK_SHARE * displaySlots;
  return {
    ...work,
    minimumOwn,
    maximumOther,
    passes: work.own >= minimumOwn && work.other <= maximumOther,
  };
}

function footprintComparison(
  boundary: number,
  app: number,
  read: TimeSpan,
  rows: readonly FootprintSample[]
): FootprintComparison {
  const notComparable = (reason: string, around: FootprintSample[] = []) => ({
    boundary,
    app,
    read,
    rows: around,
    low: null,
    high: null,
    signedError: null,
    tolerance: null,
    comparable: false,
    reason,
    passes: false,
  });
  const before = rows.filter((row) => row.endNs <= read.startNs).at(-1);
  const after = rows.find((row) => row.startNs >= read.endNs);
  if (before === undefined || after === undefined) {
    return notComparable(
      'Activity Monitor has no row that ends before the read or no row that starts after it'
    );
  }
  const around = rows.filter(
    (row) => row.endNs >= before.startNs && row.startNs <= after.endNs
  );
  if (after.endNs - before.startNs > MAXIMUM_FOOTPRINT_ROWS_NS) {
    return notComparable(
      `the Activity Monitor rows around the read cover ${(after.endNs - before.startNs) / NANOSECONDS_PER_MS} ms, more than ${MAXIMUM_FOOTPRINT_ROWS_NS / NANOSECONDS_PER_MS} ms`,
      around
    );
  }
  const values = around.map((row) => row.footprintKb);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const tolerance = Math.max(
    MEMORY_TOLERANCE.absolute,
    MEMORY_TOLERANCE.relative * high
  );
  if (high - low >= tolerance) {
    return notComparable(
      `the Activity Monitor rows around the read differ by ${high - low} kB, not less than the tolerance of ${tolerance} kB`,
      around
    );
  }
  const signedError = app < low ? app - low : app > high ? app - high : 0;
  return {
    boundary,
    app,
    read,
    rows: around,
    low,
    high,
    signedError,
    tolerance,
    comparable: true,
    reason: null,
    passes: Math.abs(signedError) <= tolerance,
  };
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

function spanSeconds(span: TimeSpan): number {
  return (span.endNs - span.startNs) / 1e9;
}
