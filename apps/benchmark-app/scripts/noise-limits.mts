import path from 'node:path';

import type { NoiseLimitsOptions } from './arguments.mts';
import { ToolError } from './errors.mts';
import { METRIC_COMPARISONS, verdictMetricsOf } from './metrics.mts';
import type { VerdictMetric } from './metrics.mts';
import { variantDifferences } from './report.mts';
import { acceptedValues, readResult } from './results.mts';
import type { ScenarioOutcome } from './session.mts';
import {
  createRandom,
  difference,
  quantile,
  sortedQuantile,
} from './statistics.mts';
import type { Comparison, ResamplingOptions } from './statistics.mts';
import type { NoiseLimits } from './verdict.mts';

export const NOISE_LIMIT_PERCENTILE = 0.975;
export const NOISE_LIMIT_FLOORS: Record<VerdictMetric, number> = {
  frameDurationMedian: 0.02,
  frameDurationP95: 0.02,
  jankyFrames: 0.005,
  uiThreadCpu: 0.02,
  jsThreadCpu: 0.02,
  memory: 0.02,
  memoryGrowth: 4000,
  coldStart: 0.02,
};
export const EXACT_SPLITS_LIMIT = 200_000;
export const RANDOM_SPLITS: ResamplingOptions = {
  seed: 20261112,
  iterations: 20_000,
};

interface MeasuredScenario {
  folder: string;
  outcome: ScenarioOutcome;
}

export function noiseLimitsCommand(options: NoiseLimitsOptions): number {
  const measured = options.runs.flatMap((folder) =>
    completeAaScenarios(path.resolve(folder))
  );
  checkUniqueScenarios(measured);
  const limits = computeNoiseLimits(measured.map(({ outcome }) => outcome));
  console.log(JSON.stringify(limits, null, 2));
  return 0;
}

function completeAaScenarios(folder: string): MeasuredScenario[] {
  const result = readResult(folder);
  const differences = variantDifferences(result.config, result.variants);
  if (differences.length > 0) {
    throw new ToolError(
      `${folder} is not an A/A run. A and B differ in: ${differences.map((row) => row.field).join(', ')}`
    );
  }
  return result.scenarios
    .filter((outcome) => outcome.failed === null)
    .map((outcome) => ({ folder, outcome }));
}

function checkUniqueScenarios(measured: MeasuredScenario[]) {
  measured.forEach(({ folder, outcome }, i) => {
    const earlier = measured
      .slice(0, i)
      .find((other) => other.outcome.scenario === outcome.scenario);
    if (earlier) {
      throw new ToolError(
        `The scenario ${outcome.scenario} is in two runs: ${earlier.folder} and ${folder}`
      );
    }
  });
}

export function computeNoiseLimits(outcomes: ScenarioOutcome[]): NoiseLimits {
  const limits: NoiseLimits = {};
  for (const outcome of outcomes) {
    const metrics: Partial<Record<VerdictMetric, number>> = {};
    for (const metric of verdictMetricsOf(outcome.scenario)) {
      const limit = splitNoise(
        acceptedValues(outcome, metric, 'a'),
        acceptedValues(outcome, metric, 'b'),
        METRIC_COMPARISONS[metric]
      );
      if (limit !== null) {
        metrics[metric] = Math.max(limit, NOISE_LIMIT_FLOORS[metric]);
      }
    }
    limits[outcome.scenario] = metrics;
  }
  return limits;
}

export function splitNoise(
  a: readonly number[],
  b: readonly number[],
  comparison: Comparison
): number | null {
  if (a.length === 0 || b.length === 0) {
    return null;
  }
  const pool = [...a, ...b].sort((left, right) => left - right);
  const smallestFirstMedian = sortedQuantile(pool.slice(0, a.length), 0.5);
  if (comparison === 'relative' && !(smallestFirstMedian > 0)) {
    return null;
  }
  const differences: number[] = [];
  for (const inFirstGroup of splitsOf(pool.length, a.length)) {
    const first = pool.filter((_, i) => inFirstGroup[i]);
    const second = pool.filter((_, i) => !inFirstGroup[i]);
    differences.push(
      Math.abs(
        difference(
          sortedQuantile(first, 0.5),
          sortedQuantile(second, 0.5),
          comparison
        )
      )
    );
  }
  return quantile(differences, NOISE_LIMIT_PERCENTILE);
}

function splitsOf(count: number, firstSize: number): Iterable<boolean[]> {
  return binomial(count, firstSize) <= EXACT_SPLITS_LIMIT
    ? allSplits(count, firstSize)
    : randomSplits(count, firstSize, RANDOM_SPLITS);
}

function binomial(count: number, chosen: number): number {
  let result = 1;
  for (let i = 1; i <= chosen; i++) {
    result = (result * (count - chosen + i)) / i;
  }
  return Math.round(result);
}

function* allSplits(count: number, firstSize: number): Generator<boolean[]> {
  const indices = Array.from({ length: firstSize }, (_, i) => i);
  while (true) {
    yield membership(indices, count);
    let i = firstSize - 1;
    while (i >= 0 && indices[i] === count - firstSize + i) {
      i--;
    }
    if (i < 0) {
      return;
    }
    indices[i]++;
    for (let j = i + 1; j < firstSize; j++) {
      indices[j] = indices[j - 1] + 1;
    }
  }
}

function* randomSplits(
  count: number,
  firstSize: number,
  options: ResamplingOptions
): Generator<boolean[]> {
  const random = createRandom(options.seed);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let split = 0; split < options.iterations; split++) {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    yield membership(order.slice(0, firstSize), count);
  }
}

function membership(indices: readonly number[], count: number): boolean[] {
  const members = new Array<boolean>(count).fill(false);
  indices.forEach((index) => {
    members[index] = true;
  });
  return members;
}
