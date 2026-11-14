import { ToolError } from './errors.mts';
import { quantileOrNull } from './frames.mts';
import type {
  EpochReading,
  InAppSample,
  SampleEpoch,
} from './in-app-sample.mts';
import type { TraceEpoch, TraceSpan } from './xctrace-metrics.mts';

export interface ClockMapping {
  offsetNs: number;
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
  tolerance: number | null;
  passes: boolean;
}

export interface CrosscheckEpoch extends SampleEpoch {
  index: number;
  windowSeconds: number;
  uiThreadCpu: ComparedValue;
  jsThreadCpu: ComparedValue;
  processCpu: ComparedValue;
  mountBatchCount: ComparedValue;
  updateCount: { app: number | null; trace: number };
  uiUpdateDurationMedian: ComparedValue | null;
  uiUpdateDurationP95: ComparedValue | null;
}

export interface CrosscheckVerdict {
  counters: boolean;
  updateDurationsEqualTraceFrames: boolean;
}

export const CPU_TOLERANCE: Tolerance = { absolute: 1, relative: 0.02 };

export const UPDATE_DURATION_TOLERANCE: Tolerance = {
  absolute: 0.25,
  relative: 0.05,
};

const EXACT: Tolerance = { absolute: 0, relative: 0 };

const MAXIMUM_CLOCK_SPREAD_NS = 1_000_000;

export function mapAppClock(
  sample: InAppSample,
  boundaryTraceNs: readonly number[]
): ClockMapping {
  if (boundaryTraceNs.length !== sample.boundaries.length) {
    throw new ToolError(
      `The trace has ${boundaryTraceNs.length} Boundary signposts of the app, and its SAMPLE line has ${sample.boundaries.length} boundaries`
    );
  }
  const offsets = sample.boundaries
    .map((boundary, i) => boundaryTraceNs[i] - boundary.signpostNs)
    .sort((left, right) => left - right);
  const spreadNs = offsets[offsets.length - 1] - offsets[0];
  if (spreadNs > MAXIMUM_CLOCK_SPREAD_NS) {
    throw new ToolError(
      `The clock of the app and the clock of the trace differ by ${spreadNs} ns between the Boundary signposts, more than ${MAXIMUM_CLOCK_SPREAD_NS} ns`
    );
  }
  return { offsetNs: offsets[Math.floor(offsets.length / 2)], spreadNs };
}

export function traceSpans(
  readings: readonly EpochReading[],
  { offsetNs }: ClockMapping
): TraceSpan[] {
  return readings.map(({ window }) => ({
    startNs: window.startNs + offsetNs,
    endNs: window.endNs + offsetNs,
  }));
}

export function compareEpochs(
  epochs: readonly SampleEpoch[],
  readings: readonly EpochReading[],
  traced: readonly TraceEpoch[]
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
    return {
      ...epoch,
      index,
      windowSeconds: reading.window.seconds,
      uiThreadCpu: compared(
        reading.cpu.uiThreadCpu,
        trace.uiThreadCpu,
        CPU_TOLERANCE
      ),
      jsThreadCpu: compared(
        reading.cpu.jsThreadCpu,
        trace.jsThreadCpu,
        CPU_TOLERANCE
      ),
      processCpu: compared(
        reading.cpu.processCpu,
        trace.processCpu,
        CPU_TOLERANCE
      ),
      mountBatchCount: compared(
        reading.mountBatchCount,
        trace.mountBatchCount,
        EXACT
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

export function crosscheckVerdict(
  epochs: readonly CrosscheckEpoch[]
): CrosscheckVerdict {
  const durations = epochs.flatMap((epoch) =>
    [epoch.uiUpdateDurationMedian, epoch.uiUpdateDurationP95].filter(
      (value) => value !== null
    )
  );
  return {
    counters: epochs.every(
      (epoch) =>
        epoch.uiThreadCpu.passes &&
        epoch.jsThreadCpu.passes &&
        epoch.processCpu.passes &&
        epoch.mountBatchCount.passes
    ),
    updateDurationsEqualTraceFrames:
      durations.length > 0 && durations.every((value) => value.passes),
  };
}

function compared(
  app: number | null,
  trace: number | null,
  tolerance: Tolerance
): ComparedValue {
  if (app === null || trace === null) {
    return {
      app,
      trace,
      signedError: null,
      absoluteError: null,
      relativeError: null,
      tolerance: null,
      passes: false,
    };
  }
  const signedError = app - trace;
  const allowed = Math.max(
    tolerance.absolute,
    tolerance.relative * Math.abs(trace)
  );
  return {
    app,
    trace,
    signedError,
    absoluteError: Math.abs(signedError),
    relativeError: trace === 0 ? null : signedError / trace,
    tolerance: allowed,
    passes: Math.abs(signedError) <= allowed,
  };
}
