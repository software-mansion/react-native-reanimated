import fs from 'node:fs';
import path from 'node:path';

import { VARIANT_KEYS } from './config.mts';
import type { RunConfig, VariantKey, VariantsConfig } from './config.mts';
import { PLATFORM_DEFINITIONS, isPlatformName } from './definitions.mts';
import { ToolError } from './errors.mts';
import type { ExpectationResult } from './expectations.mts';
import { NULL_ALLOWED } from './metrics.mts';
import type { ComparedMetric } from './metrics.mts';
import { NOISE_LIMITS_RECORD } from './noise-limits-record.mts';
import type { NoiseLimitsRecord } from './noise-limits-record.mts';
import { RESULT_FILE } from './paths.mts';
import type {
  DeviceState,
  InAppState,
  PlatformDefinition,
  PlatformName,
  ToolVersions,
} from './platform.mts';
import type { SampleResult } from './samples.mts';
import { SCENARIOS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import type { Judged, ScenarioOutcome } from './session.mts';
import { VALIDATION_RECORD } from './validation-record.mts';
import type { MetricValidity, ValidationRecord } from './validation-record.mts';
import {
  aBoolean,
  aNumber,
  aString,
  anInteger,
  anObject,
  both,
  listOf,
  nullable,
  oneOf,
  optional,
  shape,
  throwProblems,
  valuesOf,
  when,
} from './validation.mts';
import type { Check } from './validation.mts';
import type { BuiltVariant } from './variant-build.mts';
import type { AdvisoryRow, VerdictRow } from './verdict.mts';

export type MeasurementStatus =
  | 'running'
  | 'done'
  | 'interrupted'
  | 'tool error';

export interface Segment {
  startedAt: string;
  finishedAt?: string;
  status: MeasurementStatus;
  error?: string;
  device: DeviceState;
}

export type MeasuredVariant = BuiltVariant & {
  installFile: string;
  installFileSha256: string;
};

export type AbandonedScenario<R extends Judged = SampleResult> =
  ScenarioOutcome<R> & { segment: number };

export type ResultCommand = 'run' | 'memory';

export interface MeasurementResult<R extends Judged = SampleResult> {
  formatVersion: typeof FORMAT_VERSION;
  measurementRevision: number;
  platform: PlatformName;
  command: ResultCommand;
  status: MeasurementStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  config: VariantsConfig;
  options: { keepTraces: boolean };
  segments: Segment[];
  appRefreshRate: number | null;
  inAppState?: InAppState;
  tools: ToolVersions;
  variants: Partial<Record<VariantKey, MeasuredVariant>>;
  scenarios: ScenarioOutcome<R>[];
  incompleteScenario: ScenarioOutcome<R> | null;
  abandonedScenarios: AbandonedScenario<R>[];
}

export interface RunResult extends MeasurementResult {
  command: 'run';
  config: RunConfig;
  options: {
    blocks: number;
    noiseLimitsFile: string | null;
    validationFile?: string | null;
    keepTraces: boolean;
  };
  noiseLimits: NoiseLimitsRecord | null;
  validation?: ValidationRecord | null;
  validity?: MetricValidity | null;
  verdictRows: VerdictRow[];
  advisoryRows: AdvisoryRow[];
  expectations: ExpectationResult[];
}

export const FORMAT_VERSION = 1;

const MEASUREMENT_STATUSES: readonly MeasurementStatus[] = [
  'running',
  'done',
  'interrupted',
  'tool error',
];

export type StoredCheck = (definition: PlatformDefinition) => Check;

export const RECORDED_SAMPLE: Check = both(
  shape({
    variant: oneOf(VARIANT_KEYS),
    round: anInteger,
    attempt: anInteger,
    position: anInteger,
    segment: anInteger,
    accepted: aBoolean,
    valid: aBoolean,
    timings: anObject,
  }),
  when(
    (sample) => sample.valid === false,
    shape({ cause: aString, detail: aString })
  )
);

const STORED_SCENARIO_REPORT: Check = shape({
  version: anInteger,
  load: anInteger,
});

const FAILED_SCENARIO: Check = shape({
  scenario: oneOf(SCENARIOS),
  variants: listOf(oneOf(VARIANT_KEYS)),
  causes: listOf(
    shape({ variant: oneOf(VARIANT_KEYS), cause: aString, detail: aString })
  ),
});

const PACKAGE_SOURCE: Check = both(
  shape({ kind: oneOf(['npm', 'tarball']) }),
  both(
    when((source) => source.kind === 'npm', shape({ version: aString })),
    when((source) => source.kind === 'tarball', shape({ path: aString }))
  )
);

const STORED_VARIANT: Check = shape({
  reanimated: PACKAGE_SOURCE,
  worklets: PACKAGE_SOURCE,
  reanimatedFlags: valuesOf(aBoolean),
  workletsFlags: valuesOf(aBoolean),
  bundleMode: aBoolean,
  profiling: aBoolean,
});

const runSample: StoredCheck = (definition) =>
  both(
    RECORDED_SAMPLE,
    when(
      (sample) => sample.valid === true,
      shape({
        report: STORED_SCENARIO_REPORT,
        metrics: shape(
          Object.fromEntries(
            [...definition.verdictMetrics, ...definition.advisoryMetrics].map(
              (metric) => [
                metric,
                NULL_ALLOWED[metric] ? nullable(aNumber) : aNumber,
              ]
            )
          )
        ),
      })
    )
  );

const runFields: StoredCheck = (definition) =>
  shape({
    config: shape({
      scenarios: listOf(oneOf(SCENARIOS)),
      blocks: optional(valuesOf(anInteger)),
      expect: listOf(
        shape({
          scenarios: listOf(oneOf(SCENARIOS)),
          metrics: listOf(oneOf(definition.verdictMetrics)),
          is: oneOf(['notWorse', 'better']),
          byAtLeast: optional(aNumber),
        })
      ),
    }),
    options: shape({
      blocks: anInteger,
      noiseLimitsFile: nullable(aString),
      validationFile: optional(nullable(aString)),
      keepTraces: aBoolean,
    }),
    noiseLimits: nullable(NOISE_LIMITS_RECORD),
    validation: optional(nullable(VALIDATION_RECORD)),
    validity: optional(
      nullable(
        shape({
          validated: listOf(oneOf(definition.verdictMetrics)),
          reason: nullable(aString),
        })
      )
    ),
    verdictRows: listOf(anObject),
    advisoryRows: listOf(anObject),
    expectations: listOf(anObject),
  });

export function measurementFolderName(date: Date, name: string): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${stamp}-${name}`;
}

export function createMeasurementFolder(
  outputDir: string,
  date: Date,
  name: string
): string {
  const base = path.join(outputDir, measurementFolderName(date, name));
  let folder = base;
  for (let copy = 2; fs.existsSync(folder); copy++) {
    folder = `${base}-${copy}`;
  }
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

export function readResult(folder: string): RunResult {
  return readMeasurementResult<RunResult>(folder, 'run', runFields, runSample);
}

export function readMeasurementResult<R extends MeasurementResult<Judged>>(
  folder: string,
  command: R['command'],
  commandFields: StoredCheck,
  sample: StoredCheck
): R {
  const file = path.join(folder, RESULT_FILE);
  let stored: unknown;
  try {
    stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError(`Cannot read ${file}: ${(error as Error).message}`);
  }
  const version = (stored as { formatVersion?: unknown } | null)?.formatVersion;
  if (version !== FORMAT_VERSION) {
    throw new ToolError(
      `${file} has the result format version ${JSON.stringify(version)}. This driver reads only version ${FORMAT_VERSION}.`
    );
  }
  const storedCommand = (stored as { command?: unknown }).command;
  if (storedCommand !== command) {
    throw new ToolError(
      `${folder} holds the result of the ${String(storedCommand)} command, not of the ${command} command`
    );
  }
  const platform = (stored as { platform?: unknown }).platform;
  if (!isPlatformName(platform)) {
    throw new ToolError(
      `${file} has the platform ${JSON.stringify(platform)}. This driver knows only ${Object.keys(PLATFORM_DEFINITIONS).join(', ')}.`
    );
  }
  const definition = PLATFORM_DEFINITIONS[platform];
  const problems: string[] = [];
  both(
    measurementShape(definition, sample(definition)),
    commandFields(definition)
  )(stored, 'result', problems);
  throwProblems(`${file} is not a valid result`, problems);
  return stored as R;
}

export function writeResult(folder: string, result: MeasurementResult<Judged>) {
  const file = path.join(folder, RESULT_FILE);
  fs.writeFileSync(
    `${file}.partial`,
    `${JSON.stringify(result, rejectNonFinite, 2)}\n`
  );
  fs.renameSync(`${file}.partial`, file);
}

export function scenariosWithoutData(
  result: MeasurementResult<Judged>,
  scenarios: readonly Scenario[]
): Scenario[] {
  return scenarios.filter(
    (scenario) =>
      !result.scenarios.some((outcome) => outcome.scenario === scenario)
  );
}

export function acceptedValues(
  outcome: ScenarioOutcome,
  metric: ComparedMetric,
  variant: VariantKey
): number[] {
  return outcome.samples.flatMap((sample) => {
    const selected =
      sample.valid && sample.accepted && sample.variant === variant;
    const value = selected
      ? (sample.metrics as Partial<Record<ComparedMetric, number | null>>)[
          metric
        ]
      : null;
    return typeof value === 'number' ? [value] : [];
  });
}

export function finiteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new ToolError(`${label} is ${value}, not a finite number`);
  }
  return value;
}

function measurementShape(
  definition: PlatformDefinition,
  sample: Check
): Check {
  const outcome = shape({
    scenario: oneOf(SCENARIOS),
    samples: listOf(sample),
    failed: nullable(FAILED_SCENARIO),
  });
  return shape({
    measurementRevision: anInteger,
    status: oneOf(MEASUREMENT_STATUSES),
    startedAt: aString,
    config: shape({
      name: aString,
      a: STORED_VARIANT,
      b: STORED_VARIANT,
      note: optional(aString),
    }),
    options: shape({ keepTraces: aBoolean }),
    segments: both(
      listOf(
        shape({
          startedAt: aString,
          status: oneOf(MEASUREMENT_STATUSES),
          device: definition.deviceState,
        })
      ),
      nonEmpty
    ),
    appRefreshRate: nullable(aNumber),
    tools: valuesOf(aString),
    variants: valuesOf(
      shape({
        applicationId: aString,
        artifact: aString,
        installFile: aString,
        installFileSha256: aString,
        installedVersions: shape({ reanimated: aString, worklets: aString }),
        lockfileSha256: aString,
        appBuild: optional(aString),
        effectiveFlags: shape({
          reanimated: valuesOf(aBoolean),
          worklets: valuesOf(aBoolean),
        }),
      })
    ),
    scenarios: listOf(outcome),
    incompleteScenario: nullable(outcome),
    abandonedScenarios: listOf(both(outcome, shape({ segment: anInteger }))),
    inAppState: optional(definition.inAppState),
  });
}

function nonEmpty(value: unknown, label: string, problems: string[]) {
  if (Array.isArray(value) && value.length === 0) {
    problems.push(`${label} must have at least one entry`);
  }
}

function rejectNonFinite(key: string, value: unknown): unknown {
  return typeof value === 'number'
    ? finiteNumber(value, `The result field "${key}"`)
    : value;
}
