import type { Comparison } from './statistics.mts';

export type ComparedMetric = (typeof COMPARED_METRICS)[number];

export type MetricUnit = 'ms' | 'Mcycles' | 'share' | 'ms/s' | 'kB';

export interface ComparisonRule {
  unit: MetricUnit;
  comparison: Comparison;
  noiseFloor: number;
  shareOf?: string;
}

export interface CommonSampleMetrics {
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
  renderThreadCpu: number;
  uiThreadCpuWork: number | null;
  processCpuWork: number | null;
  frameCyclesMedian: number | null;
  frameCyclesP95: number | null;
  frameCyclesCoverage: number | null;
}

export interface IosSampleMetrics extends CommonSampleMetrics {
  uiUpdateDurationMedian: number | null;
  uiUpdateDurationP90: number | null;
  uiUpdateDurationP95: number | null;
  uiUpdateDurationP99: number | null;
  missedDisplayLinkCallbacks: number | null;
  performanceCoreShare: number | null;
  clusterSwitches: number;
}

export type SampleMetrics = AndroidSampleMetrics | IosSampleMetrics;

type StoredSampleMetrics = AndroidSampleMetrics & IosSampleMetrics;

export const COMPARED_METRICS = [
  'frameDurationMedian',
  'frameDurationP95',
  'frameCyclesMedian',
  'frameCyclesP95',
  'uiUpdateDurationMedian',
  'uiUpdateDurationP95',
  'jankyFrames',
  'missedDisplayLinkCallbacks',
  'uiThreadCpu',
  'jsThreadCpu',
  'performanceCoreShare',
  'memory',
  'coldStart',
] as const;

export const NULL_ALLOWED: {
  [M in ComparedMetric]: null extends StoredSampleMetrics[M] ? true : false;
} = {
  frameDurationMedian: true,
  frameDurationP95: true,
  frameCyclesMedian: true,
  frameCyclesP95: true,
  uiUpdateDurationMedian: true,
  uiUpdateDurationP95: true,
  jankyFrames: false,
  missedDisplayLinkCallbacks: true,
  uiThreadCpu: false,
  jsThreadCpu: false,
  performanceCoreShare: true,
  memory: false,
  coldStart: false,
};

const RELATIVE_NOISE_FLOOR = 0.02;

const ABSOLUTE_SHARE_NOISE_FLOOR = 0.005;

export const COMPARISON_RULES: Record<ComparedMetric, ComparisonRule> = {
  frameDurationMedian: relative('ms'),
  frameDurationP95: relative('ms'),
  frameCyclesMedian: relative('Mcycles'),
  frameCyclesP95: relative('Mcycles'),
  uiUpdateDurationMedian: relative('ms'),
  uiUpdateDurationP95: relative('ms'),
  jankyFrames: absoluteShare('frames'),
  missedDisplayLinkCallbacks: absoluteShare('display refreshes'),
  uiThreadCpu: relative('ms/s'),
  jsThreadCpu: relative('ms/s'),
  performanceCoreShare: absoluteShare('process CPU time'),
  memory: relative('kB'),
  coldStart: relative('ms'),
};

function relative(unit: MetricUnit): ComparisonRule {
  return { unit, comparison: 'relative', noiseFloor: RELATIVE_NOISE_FLOOR };
}

function absoluteShare(shareOf: string): ComparisonRule {
  return {
    unit: 'share',
    comparison: 'absolute',
    noiseFloor: ABSOLUTE_SHARE_NOISE_FLOOR,
    shareOf,
  };
}
