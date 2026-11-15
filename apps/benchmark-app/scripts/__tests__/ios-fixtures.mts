import type {
  InAppBoundary,
  InAppSample,
  InAppUpdates,
} from '../in-app-sample.mts';
import type { IosSampleMetrics } from '../metrics.mts';
import type { TraceWindow } from '../samples.mts';

export const SAMPLE_PREFIX = 'ReanimatedBenchmark: SAMPLE ';

export const START_BOUNDARY: InAppBoundary = {
  uiReadStartNs: 0,
  uiReadEndNs: 5_000,
  uiThreadCpuUs: 1_000_000,
  jsReadStartNs: 5_000,
  jsReadEndNs: 10_000,
  jsThreadCpuUs: 500_000,
  processReadStartNs: 10_000,
  processReadEndNs: 20_000,
  processCpuUs: 2_000_000,
  processPerformanceCpuUs: 1_200_000,
  processClusterSwitches: 400,
  processInstructions: 10_000_000_000,
  processCycles: 5_000_000_000,
  footprintReadStartNs: 20_000,
  footprintReadEndNs: 21_000,
  signpostStartNs: 22_000,
  signpostEndNs: 28_000,
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
  uiReadStartNs: 10_000_000_000,
  uiReadEndNs: 10_000_005_000,
  uiThreadCpuUs: 4_500_000,
  jsReadStartNs: 10_000_005_000,
  jsReadEndNs: 10_000_010_000,
  jsThreadCpuUs: 520_000,
  processReadStartNs: 10_000_010_000,
  processReadEndNs: 10_000_020_000,
  processCpuUs: 5_530_000,
  processPerformanceCpuUs: 4_024_000,
  processClusterSwitches: 550,
  processInstructions: 20_590_000_000,
  processCycles: 10_295_000_000,
  footprintReadStartNs: 10_000_020_000,
  footprintReadEndNs: 10_000_021_000,
  signpostStartNs: 10_000_022_000,
  signpostEndNs: 10_000_028_000,
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
  performanceCoreShare: 0.8,
  clusterSwitches: 150,
  processClockRate: 1.5,
  processInstructionsPerCycle: 2,
  processInstructionRate: 1.059,
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
    cpuCount: 6,
    maxThermal: 0,
    epochs: [
      {
        load: 'none',
        collector: 'full',
        seconds: 10,
        work: { own: 0, other: 0 },
      },
    ],
    boundaries: [START_BOUNDARY, END_BOUNDARY],
    updates: steadyUpdates(600),
    ...overrides,
  };
}

export function endpointsSample(): InAppSample {
  return inAppSample({
    epochs: [
      {
        load: 'none',
        collector: 'endpoints',
        seconds: 10,
        work: { own: 0, other: 0 },
      },
    ],
    boundaries: [START_BOUNDARY, { ...END_BOUNDARY, updates: 0 }],
    updates: steadyUpdates(0),
  });
}

export function sampleText(
  sample: InAppSample = inAppSample(),
  error: string | null = null
): string {
  return JSON.stringify({ format: 4, error, ...sample });
}

export function sampleLine(sample: InAppSample = inAppSample()): string {
  return `${SAMPLE_PREFIX}${sampleText(sample)}`;
}
