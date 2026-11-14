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
import { splitDifferenceQuantile } from './statistics.mts';
import type { NoiseLimits } from './verdict.mts';

interface MeasuredScenario {
  folder: string;
  outcome: ScenarioOutcome;
}

interface CalibrationRun {
  folder: string;
  result: RunResult;
  device: DeviceIdentity;
}

const NOISE_LIMIT_PERCENTILE = 0.975;

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

function acceptedCounts(outcome: ScenarioOutcome) {
  const count = (variant: 'a' | 'b') =>
    outcome.samples.filter(
      (sample) => sample.valid && sample.accepted && sample.variant === variant
    ).length;
  return { a: count('a'), b: count('b') };
}

function computeNoiseLimits(
  outcomes: ScenarioOutcome[],
  definition: PlatformDefinition
): NoiseLimits {
  const limits: NoiseLimits = {};
  for (const outcome of outcomes) {
    const metrics: Partial<Record<ComparedMetric, number>> = {};
    for (const metric of definition.verdictMetrics) {
      const rule = COMPARISON_RULES[metric];
      const limit = splitDifferenceQuantile(
        acceptedValues(outcome, metric, 'a'),
        acceptedValues(outcome, metric, 'b'),
        rule.comparison,
        NOISE_LIMIT_PERCENTILE
      );
      if (limit !== null) {
        metrics[metric] = Math.max(limit, rule.noiseFloor);
      }
    }
    limits[outcome.scenario] = metrics;
  }
  return limits;
}
