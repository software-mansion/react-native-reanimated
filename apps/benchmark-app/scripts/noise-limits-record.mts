import { PLATFORM_DEFINITIONS, isPlatformName } from './definitions.mts';
import { ToolError } from './errors.mts';
import { MEASUREMENT_REVISION } from './measurement-rules.mts';
import type { ComparedMetric } from './metrics.mts';
import type { PlatformName } from './platform.mts';
import { isScenario } from './scenarios.mts';
import { record, throwProblems } from './validation.mts';
import type { NoiseLimits } from './verdict.mts';

export interface NoiseLimitsRecord {
  formatVersion: typeof NOISE_LIMITS_FORMAT_VERSION;
  platform: PlatformName;
  measurementRevision: number;
  limits: NoiseLimits;
}

export const NOISE_LIMITS_FORMAT_VERSION = 1;

export function validateNoiseLimitsRecord(raw: unknown): NoiseLimitsRecord {
  const problems: string[] = [];
  const stored = record(raw, 'noise limits', problems);
  if (stored.formatVersion !== NOISE_LIMITS_FORMAT_VERSION) {
    throw new ToolError(
      `The noise limits file has the format version ${JSON.stringify(stored.formatVersion)}. This driver reads only version ${NOISE_LIMITS_FORMAT_VERSION}. Make the file again with the noise-limits command.`
    );
  }
  const platform = stored.platform;
  if (!isPlatformName(platform)) {
    problems.push(
      `noise limits.platform must be one of: ${Object.keys(PLATFORM_DEFINITIONS).join(', ')}`
    );
  }
  if (!Number.isInteger(stored.measurementRevision)) {
    problems.push('noise limits.measurementRevision must be an integer');
  }
  const verdictMetrics = isPlatformName(platform)
    ? PLATFORM_DEFINITIONS[platform].verdictMetrics
    : [];
  const limits = validateLimits(stored.limits, verdictMetrics, problems);
  throwProblems('The noise limits are not valid', problems);
  return {
    formatVersion: NOISE_LIMITS_FORMAT_VERSION,
    platform: platform as PlatformName,
    measurementRevision: stored.measurementRevision as number,
    limits,
  };
}

export function checkNoiseLimitsRecord(
  limits: NoiseLimitsRecord,
  platform: PlatformName
) {
  const mismatches = [
    ...(limits.platform === platform
      ? []
      : [`platform ${limits.platform}, the run is on ${platform}`]),
    ...(limits.measurementRevision === MEASUREMENT_REVISION
      ? []
      : [
          `measurement revision ${limits.measurementRevision}, the driver has revision ${MEASUREMENT_REVISION}`,
        ]),
  ];
  if (mismatches.length > 0) {
    throw new ToolError(
      `The noise limits do not fit this run: ${mismatches.join('; ')}. Make the limits again with an A/A run of this setup.`
    );
  }
}

function validateLimits(
  value: unknown,
  verdictMetrics: readonly ComparedMetric[],
  problems: string[]
): NoiseLimits {
  const limits: NoiseLimits = {};
  for (const [scenario, metrics] of Object.entries(
    record(value, 'noise limits.limits', problems)
  )) {
    if (!isScenario(scenario)) {
      problems.push(`noise limits.limits: unknown scenario "${scenario}"`);
      continue;
    }
    limits[scenario] = {};
    for (const [metric, limit] of Object.entries(
      record(metrics, `noise limits.limits.${scenario}`, problems)
    )) {
      if (!verdictMetrics.includes(metric as ComparedMetric)) {
        problems.push(
          `noise limits.limits.${scenario}: "${metric}" is not a verdict metric of the platform`
        );
      } else if (typeof limit !== 'number' || !(limit >= 0)) {
        problems.push(
          `noise limits.limits.${scenario}.${metric} must be a number of 0 or more`
        );
      } else {
        limits[scenario][metric as ComparedMetric] = limit;
      }
    }
  }
  return limits;
}
