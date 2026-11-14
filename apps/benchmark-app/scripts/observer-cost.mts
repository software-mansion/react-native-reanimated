import type { Collector, EpochCpu } from './in-app-sample.mts';
import {
  bootstrapDraws,
  bootstrapInterval,
  difference,
  median,
} from './statistics.mts';
import type { Interval } from './statistics.mts';

export type ObserverCostMetric = (typeof OBSERVER_COST_METRICS)[number];

export interface CollectorSample extends EpochCpu {
  block: number;
  collector: Collector;
  windowSeconds: number;
}

export interface ObserverCost {
  metric: ObserverCostMetric;
  medianEndpoints: number;
  medianFull: number;
  relativeDifference: number;
  interval: Interval;
  noiseLimit: number | null;
  allowed: number | null;
  within: boolean | null;
}

export const OBSERVER_COST_METRICS = [
  'uiThreadCpu',
  'jsThreadCpu',
  'processCpu',
] as const;

export const BLOCK_ORDER: readonly Collector[] = [
  'full',
  'endpoints',
  'endpoints',
  'full',
];

const ALLOWED_SHARE_OF_NOISE_LIMIT = 0.25;

export function observerCosts(
  samples: readonly CollectorSample[],
  noiseLimits: Partial<Record<ObserverCostMetric, number>>
): ObserverCost[] {
  return OBSERVER_COST_METRICS.map((metric) => {
    const valuesOf = (collector: Collector) =>
      samples
        .filter((sample) => sample.collector === collector)
        .map((sample) => sample[metric]);
    const endpoints = valuesOf('endpoints');
    const full = valuesOf('full');
    const interval = bootstrapInterval(
      bootstrapDraws(endpoints, full),
      'relative'
    );
    const noiseLimit = noiseLimits[metric] ?? null;
    const allowed =
      noiseLimit === null ? null : ALLOWED_SHARE_OF_NOISE_LIMIT * noiseLimit;
    return {
      metric,
      medianEndpoints: median(endpoints),
      medianFull: median(full),
      relativeDifference: difference(
        median(endpoints),
        median(full),
        'relative'
      ),
      interval,
      noiseLimit,
      allowed,
      within:
        allowed === null
          ? null
          : interval.low >= -allowed && interval.high <= allowed,
    };
  });
}
