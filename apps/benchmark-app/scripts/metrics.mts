import { MEMORY_GROWTH_SCENARIOS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import type { Comparison } from './statistics.mts';

export const VERDICT_METRICS = [
  'frameDurationMedian',
  'frameDurationP95',
  'jankyFrames',
  'uiThreadCpu',
  'jsThreadCpu',
  'memory',
  'memoryGrowth',
  'coldStart',
] as const;

export type VerdictMetric = (typeof VERDICT_METRICS)[number];

export interface SampleMetrics {
  frameDurationMedian: number | null;
  frameDurationP90: number | null;
  frameDurationP95: number | null;
  frameDurationP99: number | null;
  jankyFrames: number;
  frameTimelineDurationMedian: number | null;
  frameTimelineDurationP95: number | null;
  frameTimelineFrameCount: number;
  jankFlaggedFrames: number | null;
  appDeadlineMissedFrames: number | null;
  drawFrameMedian: number | null;
  drawFrameP95: number | null;
  uiThreadCpu: number;
  jsThreadCpu: number;
  renderThreadCpu: number;
  processCpu: number;
  mountBatchCount: number;
  memory: number;
  memoryGrowth: number;
  coldStart: number;
  frameCount: number;
  expectedFrameCount: number;
}

export type MetricUnit = 'ms' | 'share' | 'ms/s' | 'kB';

export const METRIC_UNITS: Record<VerdictMetric, MetricUnit> = {
  frameDurationMedian: 'ms',
  frameDurationP95: 'ms',
  jankyFrames: 'share',
  uiThreadCpu: 'ms/s',
  jsThreadCpu: 'ms/s',
  memory: 'kB',
  memoryGrowth: 'kB',
  coldStart: 'ms',
};

export const METRIC_COMPARISONS: Record<VerdictMetric, Comparison> = {
  frameDurationMedian: 'relative',
  frameDurationP95: 'relative',
  jankyFrames: 'absolute',
  uiThreadCpu: 'relative',
  jsThreadCpu: 'relative',
  memory: 'relative',
  memoryGrowth: 'absolute',
  coldStart: 'relative',
};

export function isVerdictMetric(name: unknown): name is VerdictMetric {
  return VERDICT_METRICS.includes(name as VerdictMetric);
}

export function verdictMetricsOf(scenario: Scenario): VerdictMetric[] {
  return VERDICT_METRICS.filter(
    (metric) =>
      metric !== 'memoryGrowth' || MEMORY_GROWTH_SCENARIOS.includes(scenario)
  );
}
