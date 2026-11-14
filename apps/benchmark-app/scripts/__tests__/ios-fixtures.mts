import type { IosTraceMetrics, TraceWindow } from '../xctrace-metrics.mts';

export const IOS_TRACE_METRICS: IosTraceMetrics = {
  frameDurationMedian: 6,
  frameDurationP90: 7,
  frameDurationP95: 8,
  frameDurationP99: 9,
  jankyFrames: 0,
  uiThreadCpu: 350,
  jsThreadCpu: 2,
  otherThreadsCpu: 1,
  processCpu: 353,
  mountBatchCount: 600,
  memory: 40000,
  windowMemoryDelta: 300,
  frameCount: 600,
  expectedFrameCount: 600,
  uiThreadEfficiencyCoreShare: 0.7,
  hitchCount: 0,
  hitchTime: 0,
};

export const IOS_TRACE_WINDOW: TraceWindow = {
  startNs: 1_000_000_000,
  endNs: 10_000_000_000,
  seconds: 9,
};
