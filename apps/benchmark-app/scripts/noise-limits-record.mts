import { PLATFORM_DEFINITIONS, isPlatformName } from './definitions.mts';
import { ToolError } from './errors.mts';
import { readJson } from './json-file.mts';
import { MEASUREMENT_REVISION } from './measurement-rules.mts';
import type { ComparedMetric } from './metrics.mts';
import type { DeviceIdentity, PlatformName } from './platform.mts';
import { isScenario } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import {
  aString,
  anInteger,
  listOf,
  record,
  shape,
  throwProblems,
  valuesOf,
} from './validation.mts';
import type { NoiseLimits } from './verdict.mts';

export interface NoiseLimitsSource {
  folder: string;
  samples: Partial<Record<Scenario, { a: number; b: number }>>;
}

export interface NoiseLimitsRecord {
  formatVersion: typeof NOISE_LIMITS_FORMAT_VERSION;
  platform: PlatformName;
  device: DeviceIdentity;
  measurementRevision: number;
  sources: NoiseLimitsSource[];
  limits: NoiseLimits;
}

export const NOISE_LIMITS_FORMAT_VERSION = 1;

const IDENTITY = shape({ model: aString, deviceId: aString, osBuild: aString });

const SOURCE = shape({
  folder: aString,
  samples: valuesOf(shape({ a: anInteger, b: anInteger })),
});

export function readNoiseLimitsRecord(file: string): NoiseLimitsRecord {
  return validateNoiseLimitsRecord(readJson(file));
}

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
  IDENTITY(stored.device, 'noise limits.device', problems);
  anInteger(
    stored.measurementRevision,
    'noise limits.measurementRevision',
    problems
  );
  listOf(SOURCE)(stored.sources, 'noise limits.sources', problems);
  const limits = validateLimits(
    stored.limits,
    isPlatformName(platform)
      ? PLATFORM_DEFINITIONS[platform].verdictMetrics
      : [],
    problems
  );
  throwProblems('The noise limits are not valid', problems);
  return { ...(stored as unknown as NoiseLimitsRecord), limits };
}

export function checkNoiseLimitsRecord(
  limits: NoiseLimitsRecord,
  platform: PlatformName,
  device: DeviceIdentity
) {
  const mismatches = [
    ...(limits.platform === platform
      ? []
      : [`platform ${limits.platform}, the run is on ${platform}`]),
    ...(limits.device.model === device.model
      ? []
      : [`device model ${limits.device.model}, the run is on ${device.model}`]),
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
