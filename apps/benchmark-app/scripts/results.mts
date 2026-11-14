import fs from 'node:fs';
import path from 'node:path';

import type { RunConfig, VariantKey, VariantsConfig } from './config.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import { ToolError } from './errors.mts';
import type { ExpectationResult } from './expectations.mts';
import type { ComparedMetric } from './metrics.mts';
import type { NoiseLimitsRecord } from './noise-limits-record.mts';
import type {
  DeviceState,
  InAppState,
  PlatformName,
  ToolVersions,
} from './platform.mts';
import type { SampleResult } from './samples.mts';
import { SCENARIOS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';
import type { Judged, ScenarioOutcome } from './session.mts';
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

export type RunStatus = 'running' | 'done' | 'interrupted' | 'tool error';

export interface Segment {
  startedAt: string;
  finishedAt?: string;
  status: RunStatus;
  error?: string;
  device: DeviceState;
}

export type RunVariant = BuiltVariant & {
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
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  config: VariantsConfig;
  options: { keepTraces: boolean };
  serial: string;
  segments: Segment[];
  appRefreshRate: number | null;
  inAppState?: InAppState;
  tools: ToolVersions;
  variants: Partial<Record<VariantKey, RunVariant>>;
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
    keepTraces: boolean;
  };
  noiseLimits: NoiseLimitsRecord | null;
  verdictRows: VerdictRow[];
  advisoryRows: AdvisoryRow[];
  expectations: ExpectationResult[];
}

export const FORMAT_VERSION = 1;

export const RUN_STATUSES: readonly RunStatus[] = [
  'running',
  'done',
  'interrupted',
  'tool error',
];

export const RECORDED_SAMPLE: Check = both(
  shape({
    variant: oneOf(['a', 'b']),
    block: anInteger,
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

const RUN_SAMPLE = both(
  RECORDED_SAMPLE,
  when((sample) => sample.valid === true, shape({ metrics: anObject }))
);

const RUN_FIELDS: Record<string, Check> = {
  config: shape({
    scenarios: listOf(oneOf(SCENARIOS)),
    expect: listOf(anObject),
  }),
  options: shape({
    blocks: anInteger,
    noiseLimitsFile: nullable(aString),
    keepTraces: aBoolean,
  }),
  noiseLimits: nullable(anObject),
  verdictRows: listOf(anObject),
  advisoryRows: listOf(anObject),
  expectations: listOf(anObject),
};

export function runFolderName(date: Date, name: string): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${stamp}-${name}`;
}

export function createRunFolder(
  runsDir: string,
  date: Date,
  name: string
): string {
  const base = path.join(runsDir, runFolderName(date, name));
  let folder = base;
  for (let copy = 2; fs.existsSync(folder); copy++) {
    folder = `${base}-${copy}`;
  }
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

export function readResult(folder: string): RunResult {
  return readMeasurementResult<RunResult>(
    folder,
    'run',
    RUN_FIELDS,
    RUN_SAMPLE
  );
}

export function readMeasurementResult<R extends MeasurementResult<Judged>>(
  folder: string,
  command: R['command'],
  commandFields: Record<string, Check>,
  sample: Check
): R {
  const file = path.join(folder, 'result.json');
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
  const problems: string[] = [];
  measurementShape(commandFields, sample)(stored, 'result', problems);
  throwProblems(`${file} is not a valid result`, problems);
  return stored as R;
}

export function writeResult(folder: string, result: MeasurementResult<Judged>) {
  const file = path.join(folder, 'result.json');
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
  commandFields: Record<string, Check>,
  sample: Check
): Check {
  const outcome = shape({
    scenario: oneOf(SCENARIOS),
    samples: listOf(sample),
    failed: nullable(anObject),
  });
  return shape({
    measurementRevision: anInteger,
    platform: oneOf(Object.keys(PLATFORM_DEFINITIONS)),
    status: oneOf(RUN_STATUSES),
    startedAt: aString,
    config: shape({ name: aString, a: anObject, b: anObject }),
    options: shape({ keepTraces: aBoolean }),
    segments: both(
      listOf(
        shape({
          startedAt: aString,
          status: oneOf(RUN_STATUSES),
          device: anObject,
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
        effectiveFlags: shape({ reanimated: anObject, worklets: anObject }),
      })
    ),
    scenarios: listOf(outcome),
    incompleteScenario: nullable(outcome),
    abandonedScenarios: listOf(both(outcome, shape({ segment: anInteger }))),
    inAppState: optional(anObject),
    ...commandFields,
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
