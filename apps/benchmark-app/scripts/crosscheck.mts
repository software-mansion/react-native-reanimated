import { ToolError } from './errors.mts';
import { quantileOrNull } from './frames.mts';
import { CPU_COUNTERS, boundaryReadSpan } from './in-app-sample.mts';
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

const MAXIMUM_FOOTPRINT_GAP_NS = 2_000_000_000;

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
          (2 * clock.uncertaintyNs) /
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
  { offsetNs }: ClockMapping
): ComparedValue[] {
  const sorted = [...footprints].sort(
    (left, right) => left.timeNs - right.timeNs
  );
  return sample.boundaries.map((boundary) =>
    compared(
      boundary.footprintKb,
      footprintAt(sorted, boundaryReadSpan(boundary).endNs + offsetNs),
      MEMORY_TOLERANCE
    )
  );
}

export function crosscheckVerdict(
  epochs: readonly CrosscheckEpoch[],
  footprints: readonly ComparedValue[]
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

function footprintAt(
  sorted: readonly FootprintSample[],
  timeNs: number
): number | null {
  const next = sorted.findIndex((sample) => sample.timeNs >= timeNs);
  if (next === -1) {
    return null;
  }
  const after = sorted[next];
  if (after.timeNs === timeNs) {
    return after.footprintKb;
  }
  const before = sorted[next - 1];
  if (
    before === undefined ||
    timeNs - before.timeNs > MAXIMUM_FOOTPRINT_GAP_NS ||
    after.timeNs - timeNs > MAXIMUM_FOOTPRINT_GAP_NS
  ) {
    return null;
  }
  const share = (timeNs - before.timeNs) / (after.timeNs - before.timeNs);
  return before.footprintKb + share * (after.footprintKb - before.footprintKb);
}

function memoryOutcome(footprints: readonly ComparedValue[]): MemoryOutcome {
  const comparable = footprints.filter((value) => value.trace !== null);
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
