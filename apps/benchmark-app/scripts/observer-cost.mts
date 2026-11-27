import type { Collector, EpochCpu } from './in-app-sample.mts';
import { createRandom, difference, median, quantile } from './statistics.mts';
import type { Interval, ResamplingOptions } from './statistics.mts';

export type ObserverCostMetric = (typeof OBSERVER_COST_METRICS)[number];

export type ObserverCostLimits = Partial<Record<ObserverCostMetric, number>>;

export type ValidationOutcome = 'passed' | 'failed' | 'not validated';

export interface CollectorSample extends EpochCpu {
  block: number;
  collector: Collector;
  processInstructionRate: number;
  memory: number;
  windowSeconds: number;
}

export interface ObserverCost {
  metric: ObserverCostMetric;
  blocks: number;
  medianEndpoints: number;
  medianFull: number;
  relativeDifference: number | null;
  interval: Interval | null;
  noiseLimit: number | null;
  allowed: number | null;
  outcome: ValidationOutcome;
}

interface Block {
  full: number[];
  endpoints: number[];
}

export const OBSERVER_COST_METRICS = [
  'processInstructionRate',
  'uiThreadCpu',
  'jsThreadCpu',
  'processCpu',
  'memory',
] as const;

export const BLOCK_ORDER: readonly Collector[] = [
  'full',
  'endpoints',
  'endpoints',
  'full',
];

export const MINIMUM_BLOCKS = 5;

const ALLOWED_SHARE_OF_NOISE_LIMIT = 0.25;

const BLOCK_BOOTSTRAP: ResamplingOptions = {
  seed: 20261114,
  iterations: 10_000,
};

export function observerCosts(
  samples: readonly CollectorSample[],
  noiseLimits: ObserverCostLimits
): ObserverCost[] {
  return OBSERVER_COST_METRICS.map((metric): ObserverCost => {
    const blocks = blocksOf(samples, metric);
    const all = (collector: keyof Block) =>
      blocks.flatMap((block) => block[collector]);
    const noiseLimit = noiseLimits[metric] ?? null;
    const allowed =
      noiseLimit === null ? null : ALLOWED_SHARE_OF_NOISE_LIMIT * noiseLimit;
    const cost = {
      metric,
      blocks: blocks.length,
      medianEndpoints: median(all('endpoints')),
      medianFull: median(all('full')),
      noiseLimit,
      allowed,
    };
    if (!all('endpoints').every((value) => value > 0)) {
      return {
        ...cost,
        relativeDifference: null,
        interval: null,
        outcome: 'not validated',
      };
    }
    const interval = blockBootstrapInterval(blocks, BLOCK_BOOTSTRAP);
    return {
      ...cost,
      relativeDifference: difference(
        cost.medianEndpoints,
        cost.medianFull,
        'relative'
      ),
      interval,
      outcome: outcomeOf(interval, allowed, blocks.length),
    };
  });
}

function blocksOf(
  samples: readonly CollectorSample[],
  metric: ObserverCostMetric
): Block[] {
  const blocks = new Map<number, Block>();
  for (const sample of samples) {
    const block = blocks.get(sample.block) ?? { full: [], endpoints: [] };
    block[sample.collector].push(sample[metric]);
    blocks.set(sample.block, block);
  }
  return [...blocks.values()];
}

function blockBootstrapInterval(
  blocks: readonly Block[],
  options: ResamplingOptions
): Interval {
  const random = createRandom(options.seed);
  const differences = Array.from({ length: options.iterations }, () => {
    const drawn = blocks.map(
      () => blocks[Math.floor(random() * blocks.length)]
    );
    return difference(
      median(drawn.flatMap((block) => block.endpoints)),
      median(drawn.flatMap((block) => block.full)),
      'relative'
    );
  });
  return {
    low: quantile(differences, 0.025),
    high: quantile(differences, 0.975),
  };
}

function outcomeOf(
  interval: Interval,
  allowed: number | null,
  blocks: number
): ValidationOutcome {
  if (allowed === null || blocks < MINIMUM_BLOCKS) {
    return 'not validated';
  }
  if (interval.low >= -allowed && interval.high <= allowed) {
    return 'passed';
  }
  return interval.low > allowed || interval.high < -allowed
    ? 'failed'
    : 'not validated';
}
