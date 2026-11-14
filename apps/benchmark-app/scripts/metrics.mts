import type { Comparison } from './statistics.mts';

export const VERDICT_METRICS = [
  'frameDurationMedian',
  'frameDurationP95',
  'jankyFrames',
  'uiThreadCpu',
  'jsThreadCpu',
  'memory',
  'coldStart',
] as const;

export type VerdictMetric = (typeof VERDICT_METRICS)[number];

export const RETIRED_VERDICT_METRIC = 'memoryGrowth';

export interface CommonSampleMetrics {
  frameDurationMedian: number | null;
  frameDurationP90: number | null;
  frameDurationP95: number | null;
  frameDurationP99: number | null;
  jankyFrames: number;
  uiThreadCpu: number;
  jsThreadCpu: number;
  otherThreadsCpu: number;
  processCpu: number;
  mountBatchCount: number;
  memory: number;
  windowMemoryDelta: number;
  coldStart: number;
  frameCount: number;
  expectedFrameCount: number;
}

export interface AndroidSampleMetrics extends CommonSampleMetrics {
  frameTimelineDurationMedian: number | null;
  frameTimelineDurationP95: number | null;
  frameTimelineFrameCount: number;
  jankFlaggedFrames: number | null;
  appDeadlineMissedFrames: number | null;
  drawFrameMedian: number | null;
  drawFrameP95: number | null;
  renderThreadCpu: number;
  uiThreadCpuWork: number | null;
  processCpuWork: number | null;
}

export interface IosSampleMetrics extends CommonSampleMetrics {
  uiThreadEfficiencyCoreShare: number | null;
  hitchCount: number;
  hitchTime: number;
}

export type SampleMetrics = AndroidSampleMetrics | IosSampleMetrics;

export type MetricUnit = 'ms' | 'share' | 'ms/s' | 'kB';

export const METRIC_UNITS: Record<VerdictMetric, MetricUnit> = {
  frameDurationMedian: 'ms',
  frameDurationP95: 'ms',
  jankyFrames: 'share',
  uiThreadCpu: 'ms/s',
  jsThreadCpu: 'ms/s',
  memory: 'kB',
  coldStart: 'ms',
};

export const METRIC_COMPARISONS: Record<VerdictMetric, Comparison> = {
  frameDurationMedian: 'relative',
  frameDurationP95: 'relative',
  jankyFrames: 'absolute',
  uiThreadCpu: 'relative',
  jsThreadCpu: 'relative',
  memory: 'relative',
  coldStart: 'relative',
};

export function isVerdictMetric(name: unknown): name is VerdictMetric {
  return VERDICT_METRICS.includes(name as VerdictMetric);
}
