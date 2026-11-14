import type {
  InAppBoundary,
  InAppSample,
  InAppUpdates,
} from '../in-app-sample.mts';
import type { IosSampleMetrics } from '../metrics.mts';
import type { TraceWindow } from '../samples.mts';

export const SAMPLE_PREFIX = 'ReanimatedBenchmark: SAMPLE ';

export const START_BOUNDARY: InAppBoundary = {
  readStartNs: 0,
  readEndNs: 20_000,
  signpostNs: 25_000,
  uiThreadCpuUs: 1_000_000,
  jsThreadCpuUs: 500_000,
  processCpuUs: 2_000_000,
  footprintKb: 40_000,
  thermal: 0,
  batteryLevel: 100,
  batteryState: 3,
  lowPower: false,
  brightness: 50,
  mounts: 10,
  updates: 0,
};

export const END_BOUNDARY: InAppBoundary = {
  ...START_BOUNDARY,
  readStartNs: 10_000_000_000,
  readEndNs: 10_000_020_000,
  signpostNs: 10_000_025_000,
  uiThreadCpuUs: 4_500_000,
  jsThreadCpuUs: 520_000,
  processCpuUs: 5_530_000,
  footprintKb: 40_300,
  mounts: 610,
  updates: 600,
};

export const IOS_SAMPLE_WINDOW: TraceWindow = {
  startNs: 10_000,
  endNs: 10_000_010_000,
  seconds: 10,
};

export const IOS_SAMPLE_METRICS: Omit<IosSampleMetrics, 'coldStart'> = {
  uiUpdateDurationMedian: 6,
  uiUpdateDurationP90: 6,
  uiUpdateDurationP95: 6,
  uiUpdateDurationP99: 6,
  missedDisplayLinkCallbacks: 0,
  frameCount: 600,
  expectedFrameCount: 600,
  uiThreadCpu: 350,
  jsThreadCpu: 2,
  otherThreadsCpu: 1,
  processCpu: 353,
  mountBatchCount: 600,
  memory: 40300,
  windowMemoryDelta: 300,
};

export function steadyUpdates(
  count: number,
  firstBeginNs = 1_000_000,
  durationNs = 6_000_000
): InAppUpdates {
  const beginNs = Array.from(
    { length: count },
    (_, i) => firstBeginNs + Math.round((i * 1e9) / 60)
  );
  return {
    beginNs,
    endNs: beginNs.map((begin) => begin + durationNs),
    modelTimeNs: [...beginNs],
  };
}

export function inAppSample(overrides: Partial<InAppSample> = {}): InAppSample {
  return {
    mainThread: 5001,
    jsThread: 5002,
    maxThermal: 0,
    epochs: [{ load: 'none', collector: 'full', seconds: 10 }],
    boundaries: [START_BOUNDARY, END_BOUNDARY],
    updates: steadyUpdates(600),
    ...overrides,
  };
}

export function sampleText(
  sample: InAppSample = inAppSample(),
  error: string | null = null
): string {
  return JSON.stringify({ format: 1, error, ...sample });
}

export function sampleLine(sample: InAppSample = inAppSample()): string {
  return `${SAMPLE_PREFIX}${sampleText(sample)}`;
}
