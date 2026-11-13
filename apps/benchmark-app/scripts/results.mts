import fs from 'node:fs';
import path from 'node:path';

import type { DeviceState } from './android-device.mts';
import type {
  Expectation,
  RunConfig,
  VariantKey,
  VariantsConfig,
} from './config.mts';
import { ToolError } from './errors.mts';
import type { ExpectationResult } from './expectations.mts';
import { RETIRED_VERDICT_METRIC, isVerdictMetric } from './metrics.mts';
import type { SampleMetrics, VerdictMetric } from './metrics.mts';
import type { SampleResult } from './protocol.mts';
import type { Scenario } from './scenarios.mts';
import type { Judged, SampleRecord, ScenarioOutcome } from './session.mts';
import type { ToolVersions } from './tools.mts';
import type { BuiltVariant } from './variant-build.mts';
import type { NoiseLimits, VerdictRow } from './verdict.mts';

export type RunStatus = 'running' | 'done' | 'interrupted' | 'tool error';

export interface Segment {
  startedAt: string;
  finishedAt?: string;
  status: RunStatus;
  error?: string;
  device: DeviceState;
}

export type RunVariant = BuiltVariant & { apkSha256: string };

export type AbandonedScenario<R extends Judged = SampleResult> =
  ScenarioOutcome<R> & { segment: number };

export type ResultCommand = 'run' | 'memory';

export interface MeasurementResult<R extends Judged = SampleResult> {
  formatVersion: typeof FORMAT_VERSION;
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
  tools?: ToolVersions;
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
  noiseLimits: NoiseLimits | null;
  statistics: VerdictRow[];
  expectations: ExpectationResult[];
}

type FormatOneResult = Omit<RunResult, 'formatVersion' | 'command'> & {
  formatVersion: 1;
};

export const FORMAT_VERSION = 2;

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
  return readMeasurementResult<RunResult>(folder, 'run');
}

export function readMeasurementResult<R extends MeasurementResult<Judged>>(
  folder: string,
  command: R['command']
): R {
  const file = path.join(folder, 'result.json');
  let stored: MeasurementResult<Judged> | FormatOneResult;
  try {
    stored = JSON.parse(fs.readFileSync(file, 'utf8')) as typeof stored;
  } catch (error) {
    throw new ToolError(`Cannot read ${file}: ${(error as Error).message}`);
  }
  const result =
    stored.formatVersion === 1 ? upgradedFormatOne(stored) : stored;
  if (result.command !== command) {
    throw new ToolError(
      `${folder} holds the result of the ${result.command} command, not of the ${command} command`
    );
  }
  return withSampleSegments(result as R);
}

function upgradedFormatOne(stored: FormatOneResult): RunResult {
  outcomesOf(stored)
    .flatMap((outcome) => outcome.samples)
    .forEach(renameRetiredMetric);
  return {
    ...stored,
    formatVersion: FORMAT_VERSION,
    command: 'run',
    config: {
      ...stored.config,
      expect: stored.config.expect
        .map(withCurrentMetrics)
        .filter((expectation) => expectation.metrics.length > 0),
    },
    noiseLimits: stored.noiseLimits && withCurrentLimits(stored.noiseLimits),
    statistics: stored.statistics.filter((row) => isVerdictMetric(row.metric)),
    expectations: stored.expectations
      .map(withCurrentRows)
      .filter((result) => result.expectation.metrics.length > 0),
  };
}

function outcomesOf<R extends Judged>(
  result: Pick<
    MeasurementResult<R>,
    'scenarios' | 'incompleteScenario' | 'abandonedScenarios'
  >
): ScenarioOutcome<R>[] {
  return [
    ...result.scenarios,
    ...(result.incompleteScenario ? [result.incompleteScenario] : []),
    ...result.abandonedScenarios,
  ];
}

function renameRetiredMetric(sample: SampleRecord) {
  const metrics = sample.metrics as
    | (SampleMetrics & { [RETIRED_VERDICT_METRIC]?: number })
    | undefined;
  const value = metrics?.[RETIRED_VERDICT_METRIC];
  if (metrics && value !== undefined) {
    metrics.windowMemoryDelta = value;
    delete metrics[RETIRED_VERDICT_METRIC];
  }
}

function withCurrentMetrics(expectation: Expectation): Expectation {
  return {
    ...expectation,
    metrics: expectation.metrics.filter(isVerdictMetric),
  };
}

function withCurrentRows(result: ExpectationResult): ExpectationResult {
  const current = (row: VerdictRow) => isVerdictMetric(row.metric);
  return {
    ...result,
    expectation: withCurrentMetrics(result.expectation),
    rows: result.rows.filter(current),
    decidingRows: result.decidingRows.filter(current),
  };
}

function withCurrentLimits(limits: NoiseLimits): NoiseLimits {
  return Object.fromEntries(
    Object.entries(limits).map(([scenario, metrics]) => [
      scenario,
      Object.fromEntries(
        Object.entries(metrics).filter(([metric]) => isVerdictMetric(metric))
      ),
    ])
  );
}

function withSampleSegments<R extends MeasurementResult<Judged>>(result: R): R {
  const fill = (outcome: ScenarioOutcome<Judged>, segment: number) =>
    outcome.samples.forEach((sample) => (sample.segment ??= segment));
  result.scenarios.forEach((outcome) => fill(outcome, 0));
  if (result.incompleteScenario) {
    fill(result.incompleteScenario, result.segments.length - 1);
  }
  result.abandonedScenarios.forEach((outcome) =>
    fill(outcome, outcome.segment)
  );
  return result;
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
  metric: VerdictMetric,
  variant: VariantKey
): number[] {
  return outcome.samples.flatMap((sample) => {
    const selected =
      sample.valid && sample.accepted && sample.variant === variant;
    const value = selected ? sample.metrics[metric] : null;
    return typeof value === 'number' ? [value] : [];
  });
}

export function finiteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new ToolError(`${label} is ${value}, not a finite number`);
  }
  return value;
}

function rejectNonFinite(key: string, value: unknown): unknown {
  return typeof value === 'number'
    ? finiteNumber(value, `The result field "${key}"`)
    : value;
}
