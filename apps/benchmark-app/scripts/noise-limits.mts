import path from 'node:path';

import type { NoiseLimitsOptions } from './arguments.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import { ToolError } from './errors.mts';
import { COMPARISON_RULES } from './metrics.mts';
import type { ComparedMetric } from './metrics.mts';
import { NOISE_LIMITS_FORMAT_VERSION } from './noise-limits-record.mts';
import type { NoiseLimitsRecord } from './noise-limits-record.mts';
import type { DeviceIdentity, PlatformDefinition } from './platform.mts';
import { platformOf } from './platforms.mts';
import { variantDifferences } from './report.mts';
import { acceptedValues, readResult } from './results.mts';
import type { RunResult } from './results.mts';
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
export const EXACT_SPLITS_LIMIT = 200_000;
export const RANDOM_SPLITS: ResamplingOptions = {
  seed: 20261112,
  iterations: 20_000,
};

interface MeasuredScenario {
  folder: string;
  outcome: ScenarioOutcome;
}

interface CalibrationRun {
  folder: string;
  result: RunResult;
  device: DeviceIdentity;
}

export function noiseLimitsCommand(options: NoiseLimitsOptions): number {
  const runs = options.runs.map((folder) =>
    calibrationRun(path.resolve(folder))
  );
  const [first] = runs;
  checkSameSetup(runs);
  const measured = runs.flatMap(completeAaScenarios);
  checkUniqueScenarios(measured);
  const record: NoiseLimitsRecord = {
    formatVersion: NOISE_LIMITS_FORMAT_VERSION,
    platform: first.result.platform,
    device: first.device,
    measurementRevision: first.result.measurementRevision,
    sources: runs.map((run) => ({
      folder: run.folder,
      samples: Object.fromEntries(
        measured
          .filter(({ folder }) => folder === run.folder)
          .map(({ outcome }) => [outcome.scenario, acceptedCounts(outcome)])
      ),
    })),
    limits: computeNoiseLimits(
      measured.map(({ outcome }) => outcome),
      PLATFORM_DEFINITIONS[first.result.platform]
    ),
  };
  console.log(JSON.stringify(record, null, 2));
  return 0;
}

function calibrationRun(folder: string): CalibrationRun {
  const result = readResult(folder);
  return {
    folder,
    result,
    device: platformOf(result.platform).deviceIdentity(
      result.segments[0].device
    ),
  };
}

function checkSameSetup(runs: CalibrationRun[]) {
  const [first, ...others] = runs;
  const setupOf = (run: CalibrationRun) => ({
    platform: run.result.platform,
    measurementRevision: run.result.measurementRevision,
    ...run.device,
  });
  const reference = setupOf(first);
  for (const other of others) {
    const setup = setupOf(other);
    for (const field of Object.keys(reference) as (keyof typeof reference)[]) {
      if (setup[field] !== reference[field]) {
        throw new ToolError(
          `The runs differ in ${field}: ${reference[field]} in ${first.folder}, ${setup[field]} in ${other.folder}`
        );
      }
    }
  }
}

function completeAaScenarios({
  folder,
  result,
}: CalibrationRun): MeasuredScenario[] {
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

function acceptedCounts(outcome: ScenarioOutcome) {
  const count = (variant: 'a' | 'b') =>
    outcome.samples.filter(
      (sample) => sample.valid && sample.accepted && sample.variant === variant
    ).length;
  return { a: count('a'), b: count('b') };
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

export function computeNoiseLimits(
  outcomes: ScenarioOutcome[],
  definition: PlatformDefinition
): NoiseLimits {
  const limits: NoiseLimits = {};
  for (const outcome of outcomes) {
    const metrics: Partial<Record<ComparedMetric, number>> = {};
    for (const metric of definition.verdictMetrics) {
      const rule = COMPARISON_RULES[metric];
      const limit = splitNoise(
        acceptedValues(outcome, metric, 'a'),
        acceptedValues(outcome, metric, 'b'),
        rule.comparison
      );
      if (limit !== null) {
        metrics[metric] = Math.max(limit, rule.noiseFloor);
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
