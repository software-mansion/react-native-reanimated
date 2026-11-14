import type { Comparison } from './statistics.mts';

export type ComparedMetric = (typeof COMPARED_METRICS)[number];

export type MetricUnit = 'ms' | 'Mcycles' | 'share' | 'ms/s' | 'kB';

export interface ComparisonRule {
  unit: MetricUnit;
  comparison: Comparison;
  noiseFloor: number;
}

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
  frameCyclesMedian: number | null;
  frameCyclesP95: number | null;
  frameCyclesCoverage: number | null;
}

export interface IosSampleMetrics extends CommonSampleMetrics {
  uiThreadEfficiencyCoreShare: number | null;
  hitchCount: number;
  hitchTime: number;
}

export type SampleMetrics = AndroidSampleMetrics | IosSampleMetrics;

export const COMPARED_METRICS = [
  'frameDurationMedian',
  'frameDurationP95',
  'frameCyclesMedian',
  'frameCyclesP95',
  'jankyFrames',
  'uiThreadCpu',
  'jsThreadCpu',
  'memory',
  'coldStart',
] as const;

const RELATIVE_NOISE_FLOOR = 0.02;

export const COMPARISON_RULES: Record<ComparedMetric, ComparisonRule> = {
  frameDurationMedian: relative('ms'),
  frameDurationP95: relative('ms'),
  frameCyclesMedian: relative('Mcycles'),
  frameCyclesP95: relative('Mcycles'),
  jankyFrames: { unit: 'share', comparison: 'absolute', noiseFloor: 0.005 },
  uiThreadCpu: relative('ms/s'),
  jsThreadCpu: relative('ms/s'),
  memory: relative('kB'),
  coldStart: relative('ms'),
};

function relative(unit: MetricUnit): ComparisonRule {
  return { unit, comparison: 'relative', noiseFloor: RELATIVE_NOISE_FLOOR };
}
