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
import type { Check } from './validation.mts';
import type { NoiseLimits } from './verdict.mts';

export interface NoiseLimitsSource {
  folder: string;
  samples: Partial<Record<Scenario, { a: number; b: number }>>;
}

export interface ScenarioIdentity {
  version: number;
  load: number;
}

export interface NoiseLimitsRecord {
  formatVersion: typeof NOISE_LIMITS_FORMAT_VERSION;
  platform: PlatformName;
  device: DeviceIdentity;
  measurementRevision: number;
  sources: NoiseLimitsSource[];
  scenarios: Partial<Record<Scenario, ScenarioIdentity>>;
  limits: NoiseLimits;
}

export const NOISE_LIMITS_FORMAT_VERSION = 1;

const IDENTITY = shape({ model: aString, deviceId: aString, osBuild: aString });

const SCENARIO_IDENTITY = shape({ version: anInteger, load: anInteger });

const SOURCE = shape({
  folder: aString,
  samples: valuesOf(shape({ a: anInteger, b: anInteger })),
});

export function readNoiseLimitsRecord(file: string): NoiseLimitsRecord {
  return validateNoiseLimitsRecord(readJson(file));
}

export function validateNoiseLimitsRecord(raw: unknown): NoiseLimitsRecord {
  const problems: string[] = [];
  NOISE_LIMITS_RECORD(raw, 'noise limits', problems);
  throwProblems('The noise limits are not valid', problems);
  return raw as NoiseLimitsRecord;
}

export const NOISE_LIMITS_RECORD: Check = (value, label, problems) => {
  const stored = record(value, label, problems);
  if (stored.formatVersion !== NOISE_LIMITS_FORMAT_VERSION) {
    problems.push(
      `${label} has the format version ${JSON.stringify(stored.formatVersion)}. This driver reads only version ${NOISE_LIMITS_FORMAT_VERSION}. Make the file again with the noise-limits command.`
    );
    return;
  }
  const { platform } = stored;
  if (!isPlatformName(platform)) {
    problems.push(
      `${label}.platform must be one of: ${Object.keys(PLATFORM_DEFINITIONS).join(', ')}`
    );
  }
  IDENTITY(stored.device, `${label}.device`, problems);
  anInteger(
    stored.measurementRevision,
    `${label}.measurementRevision`,
    problems
  );
  listOf(SOURCE)(stored.sources, `${label}.sources`, problems);
  const identities = checkScenarios(
    stored.scenarios,
    `${label}.scenarios`,
    problems
  );
  checkLimits(
    stored.limits,
    `${label}.limits`,
    isPlatformName(platform)
      ? PLATFORM_DEFINITIONS[platform].verdictMetrics
      : [],
    identities,
    problems
  );
};

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

export function checkScenarioIdentity(
  limits: NoiseLimitsRecord,
  scenario: Scenario,
  measured: ScenarioIdentity
) {
  const calibrated = limits.scenarios[scenario];
  if (
    calibrated &&
    (calibrated.version !== measured.version ||
      calibrated.load !== measured.load)
  ) {
    throw new ToolError(
      `The noise limits of ${scenario} are of the scenario version ${calibrated.version} with the load ${calibrated.load}, but the app reports the version ${measured.version} with the load ${measured.load}. Make the limits again with an A/A run of this scenario.`
    );
  }
}

function checkScenarios(
  value: unknown,
  label: string,
  problems: string[]
): Record<string, unknown> {
  const identities = record(value, label, problems);
  for (const [scenario, identity] of Object.entries(identities)) {
    if (isScenario(scenario)) {
      SCENARIO_IDENTITY(identity, `${label}.${scenario}`, problems);
    } else {
      problems.push(`${label}: unknown scenario "${scenario}"`);
    }
  }
  return identities;
}

function checkLimits(
  value: unknown,
  label: string,
  verdictMetrics: readonly ComparedMetric[],
  identities: Record<string, unknown>,
  problems: string[]
) {
  for (const [scenario, metrics] of Object.entries(
    record(value, label, problems)
  )) {
    if (!isScenario(scenario)) {
      problems.push(`${label}: unknown scenario "${scenario}"`);
      continue;
    }
    if (!Object.hasOwn(identities, scenario)) {
      problems.push(`${label}.${scenario} has no scenario version and load`);
    }
    for (const [metric, limit] of Object.entries(
      record(metrics, `${label}.${scenario}`, problems)
    )) {
      if (!verdictMetrics.includes(metric as ComparedMetric)) {
        problems.push(
          `${label}.${scenario}: "${metric}" is not a verdict metric of the platform`
        );
      } else if (typeof limit !== 'number' || !(limit >= 0)) {
        problems.push(
          `${label}.${scenario}.${metric} must be a number of 0 or more`
        );
      }
    }
  }
}
