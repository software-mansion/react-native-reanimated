import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type { ValidationRecordOptions } from './arguments.mts';
import {
  WORK_LOADS,
  crosscheckVerdict,
  rederivedEpoch,
  rederivedFootprint,
} from './crosscheck.mts';
import { ToolError } from './errors.mts';
import type { Collector } from './in-app-sample.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import { readJson } from './json-file.mts';
import type { ComparedMetric } from './metrics.mts';
import {
  MINIMUM_BLOCKS,
  observerCosts as observerCostsOf,
} from './observer-cost.mts';
import type {
  ObserverCostMetric,
  ValidationOutcome,
} from './observer-cost.mts';
import { isScenario } from './scenarios.mts';
import {
  STORED_CROSSCHECK,
  STORED_OBSERVER_COST,
  completeBlocks,
  identityDifferences,
  identityOf,
  readCrosscheckResult,
  readObserverCostResult,
} from './validation-sources.mts';
import type {
  CrosscheckResult,
  ObserverCostResult,
  StoredSource,
  ValidationIdentity,
} from './validation-sources.mts';
import {
  aBoolean,
  aString,
  anInteger,
  listOf,
  oneOf,
  shape,
  throwProblems,
  valuesOf,
} from './validation.mts';
import type { Check } from './validation.mts';

export interface GateResult {
  source: string;
  gate: string;
  outcome: ValidationOutcome;
}

export interface MetricValidation {
  validated: boolean;
  gates: GateResult[];
}

interface CrosscheckSummary {
  folder: string;
  trace: string;
  scenario: string;
  thermalState: number;
  loadsRan: boolean;
  epochs: {
    load: string;
    collector: Collector;
    uiThreadCpu: boolean;
    jsThreadCpu: boolean;
  }[];
}

interface ObserverCostSummary {
  folder: string;
  scenario: string;
  blocks: number;
  outcomes: Partial<Record<ObserverCostMetric, ValidationOutcome>>;
}

export interface ValidationSources {
  crosschecks: StoredSource<CrosscheckResult>[];
  observerCosts: StoredSource<ObserverCostResult>[];
}

interface SourceSummaries {
  crosschecks: CrosscheckSummary[];
  observerCosts: ObserverCostSummary[];
}

export interface ValidationRecord extends ValidationIdentity {
  formatVersion: typeof VALIDATION_FORMAT_VERSION;
  sources: ValidationSources;
  metrics: Partial<Record<ComparedMetric, MetricValidation>>;
}

export interface MetricValidity {
  validated: ComparedMetric[];
  reason: string | null;
}

export const VALIDATION_FORMAT_VERSION = 3;

const MINIMUM_CROSSCHECKS = 2;

const LOAD_SCENARIO = 'crosscheck-load';

const IDLE_SCENARIO = 'idle-cost';

const CROSSCHECK_LOADS = ['idle', ...WORK_LOADS];

const OUTCOME = oneOf(['passed', 'failed', 'not validated']);

const RECORD_SHAPE: Check = shape({
  formatVersion: oneOf([VALIDATION_FORMAT_VERSION]),
  platform: oneOf(['ios']),
  device: shape({ model: aString, deviceId: aString, osBuild: aString }),
  measurementRevision: anInteger,
  appBuild: aString,
  sources: shape({
    crosschecks: listOf(STORED_CROSSCHECK),
    observerCosts: listOf(STORED_OBSERVER_COST),
  }),
  metrics: valuesOf(
    shape({
      validated: aBoolean,
      gates: listOf(
        shape({ source: aString, gate: aString, outcome: OUTCOME })
      ),
    })
  ),
});

export const VALIDATION_RECORD: Check = (value, label, problems) => {
  const shapeProblems: string[] = [];
  RECORD_SHAPE(value, label, shapeProblems);
  problems.push(...shapeProblems);
  if (shapeProblems.length === 0) {
    problems.push(
      ...recordProblems(value as ValidationRecord).map(
        (problem) => `${label}: ${problem}`
      )
    );
  }
};

const CROSSCHECK_CPU_FIELDS: Partial<
  Record<ComparedMetric, 'uiThreadCpu' | 'jsThreadCpu'>
> = {
  uiThreadCpu: 'uiThreadCpu',
  jsThreadCpu: 'jsThreadCpu',
};

export function validationRecordCommand(
  options: ValidationRecordOptions
): number {
  const record = buildValidationRecord(
    options.crosschecks.map((folder) =>
      readCrosscheckResult(path.resolve(folder))
    ),
    options.observerCosts.map((folder) =>
      readObserverCostResult(path.resolve(folder))
    )
  );
  console.log(JSON.stringify(record, null, 2));
  return 0;
}

export function buildValidationRecord(
  crosschecks: readonly StoredSource<CrosscheckResult>[],
  observerCosts: readonly StoredSource<ObserverCostResult>[]
): ValidationRecord {
  const identity = commonIdentity([...crosschecks, ...observerCosts]);
  const sources: ValidationSources = {
    crosschecks: [...crosschecks],
    observerCosts: [...observerCosts],
  };
  throwProblems(
    'The validation record cannot be made',
    repeatedSources(sources)
  );
  return {
    formatVersion: VALIDATION_FORMAT_VERSION,
    ...identity,
    sources,
    metrics: metricValidations(sources),
  };
}

export function readValidationRecord(file: string): ValidationRecord {
  const raw = readJson(file);
  const problems: string[] = [];
  VALIDATION_RECORD(raw, 'validation', problems);
  throwProblems(`${file} is not a valid validation record`, problems);
  return raw as ValidationRecord;
}

export function metricValidity(
  record: ValidationRecord | null,
  run: ValidationIdentity | null,
  candidates: readonly ComparedMetric[]
): MetricValidity {
  if (record === null) {
    return { validated: [], reason: 'the run has no validation record' };
  }
  if (run === null) {
    return {
      validated: [],
      reason: 'the builds of the run do not have one app build identity',
    };
  }
  const differences = identityDifferences(identityOf(record), run);
  if (differences.length > 0) {
    return {
      validated: [],
      reason: `the validation record does not fit the run: ${differences.join(', ')}`,
    };
  }
  const validations = metricValidations(record.sources);
  const validated = candidates.filter(
    (metric) => validations[metric]?.validated === true
  );
  const missing = candidates.filter((metric) => !validated.includes(metric));
  return {
    validated,
    reason:
      missing.length === 0
        ? null
        : `the validation record does not validate ${missing.join(', ')}`,
  };
}

function commonIdentity(
  sources: readonly StoredSource<ValidationIdentity>[]
): ValidationIdentity {
  if (sources.length === 0) {
    throw new ToolError('A validation record needs at least one source');
  }
  const first = identityOf(sources[0].result);
  if (first.appBuild === '') {
    throw new ToolError(
      `${sources[0].folder} measured an app without an app build identity. Build the app with the driver.`
    );
  }
  for (const { folder, result } of sources.slice(1)) {
    const differences = identityDifferences(first, identityOf(result));
    if (differences.length > 0) {
      throw new ToolError(
        `${folder} is not of the same setup as ${sources[0].folder}: ${differences.join(', ')}`
      );
    }
  }
  return first;
}

function recordProblems(record: ValidationRecord): string[] {
  return [
    ...repeatedSources(record.sources),
    ...sourcesOfOtherSetups(record),
    ...inconsistentMetrics(record),
  ];
}

function repeatedSources({
  crosschecks,
  observerCosts,
}: ValidationSources): string[] {
  const repeated = (values: readonly string[]) =>
    values.filter((value, i) => values.indexOf(value) !== i);
  const all = [...crosschecks, ...observerCosts];
  const duplicates = [
    ...repeated(all.map(({ folder }) => folder)),
    ...repeated(all.map(({ sha256 }) => sha256)),
    ...repeated(crosschecks.map(({ result }) => path.resolve(result.trace))),
  ];
  return duplicates.length === 0
    ? []
    : [
        `The validation sources repeat one measurement (the same folder, result file or trace): ${[...new Set(duplicates)].join(', ')}`,
      ];
}

function sourcesOfOtherSetups(record: ValidationRecord): string[] {
  return [...record.sources.crosschecks, ...record.sources.observerCosts]
    .map(({ folder, result }) => ({
      folder,
      differences: identityDifferences(identityOf(record), identityOf(result)),
    }))
    .filter(({ differences }) => differences.length > 0)
    .map(
      ({ folder, differences }) =>
        `the source ${folder} is not of the setup of the record: ${differences.join(', ')}`
    );
}

function inconsistentMetrics(record: ValidationRecord): string[] {
  const unknown = Object.keys(record.metrics).filter(
    (metric) =>
      !(IOS_DEFINITION.verdictMetrics as readonly string[]).includes(metric)
  );
  const validations = metricValidations(record.sources);
  return [
    ...unknown.map((metric) => `${metric} is not a verdict metric of iOS`),
    ...IOS_DEFINITION.verdictMetrics.flatMap((metric) => {
      const stored = record.metrics[metric];
      const expected = validations[metric];
      if (stored === undefined || expected === undefined) {
        return [`it has no entry for ${metric}`];
      }
      if (!isDeepStrictEqual(stored.gates, expected.gates)) {
        return [`the gates of ${metric} do not follow from its sources`];
      }
      return stored.validated === expected.validated
        ? []
        : [`the flag of ${metric} does not match its gates`];
    }),
  ];
}

function metricValidations(
  sources: ValidationSources
): Partial<Record<ComparedMetric, MetricValidation>> {
  const summaries = summariesOf(sources);
  return Object.fromEntries(
    IOS_DEFINITION.verdictMetrics.map((metric) => [
      metric,
      metricValidation(metric, summaries),
    ])
  );
}

function metricValidation(
  metric: ComparedMetric,
  summaries: SourceSummaries
): MetricValidation {
  const gates = [
    ...coverageGates(summaries),
    ...summaries.crosschecks.flatMap((summary) =>
      crosscheckGates(metric, summary)
    ),
    ...summaries.observerCosts.map((summary) =>
      observerCostGate(metric, summary)
    ),
  ];
  return {
    validated:
      gates.length > 0 && gates.every((gate) => gate.outcome === 'passed'),
    gates,
  };
}

function summariesOf(sources: ValidationSources): SourceSummaries {
  return {
    crosschecks: sources.crosschecks.map(crosscheckSummary),
    observerCosts: sources.observerCosts.map(observerCostSummary),
  };
}

function crosscheckSummary({
  folder,
  result,
}: StoredSource<CrosscheckResult>): CrosscheckSummary {
  const epochs = result.epochs.map((epoch) =>
    rederivedEpoch(epoch, result.refreshRate)
  );
  const verdict = crosscheckVerdict(
    epochs,
    result.footprints.map(rederivedFootprint)
  );
  return {
    folder,
    trace: path.resolve(result.trace),
    scenario: result.scenario,
    thermalState: result.thermalState,
    loadsRan: verdict.loadsRan,
    epochs: epochs.map((epoch) => ({
      load: epoch.load,
      collector: epoch.collector,
      uiThreadCpu: epoch.uiThreadCpu.passes,
      jsThreadCpu: epoch.jsThreadCpu.passes,
    })),
  };
}

function observerCostSummary({
  folder,
  result,
}: StoredSource<ObserverCostResult>): ObserverCostSummary {
  const noiseLimits = Object.fromEntries(
    (result.costs ?? []).flatMap((cost) =>
      cost.noiseLimit === null ? [] : [[cost.metric, cost.noiseLimit]]
    )
  );
  return {
    folder,
    scenario: result.scenario,
    blocks: completeBlocks(result.samples),
    outcomes: Object.fromEntries(
      observerCostsOf(result.samples, noiseLimits).map((cost) => [
        cost.metric,
        cost.outcome,
      ])
    ),
  };
}

function coverageGates({
  crosschecks,
  observerCosts,
}: SourceSummaries): GateResult[] {
  const gate = (name: string, covered: boolean): GateResult => ({
    source: 'all',
    gate: name,
    outcome: covered ? 'passed' : 'not validated',
  });
  return [
    gate(
      `at least ${MINIMUM_CROSSCHECKS} cross-check recordings (here ${crosschecks.length})`,
      crosschecks.length >= MINIMUM_CROSSCHECKS
    ),
    gate(
      'a cross-check of a benchmark scenario with `full` and `endpoints` epochs of one load',
      crosschecks.some(isSteadyCrosscheck)
    ),
    gate(
      `a cross-check of \`${LOAD_SCENARIO}\` with the loads ${CROSSCHECK_LOADS.join(', ')}`,
      crosschecks.some(isLoadsCrosscheck)
    ),
    gate(
      `an observer-cost test of \`${IDLE_SCENARIO}\``,
      observerCosts.some(({ scenario }) => scenario === IDLE_SCENARIO)
    ),
    gate(
      'an observer-cost test of a loaded benchmark scenario',
      observerCosts.some(
        ({ scenario }) => isScenario(scenario) && scenario !== IDLE_SCENARIO
      )
    ),
  ];
}

function isSteadyCrosscheck({ scenario, epochs }: CrosscheckSummary): boolean {
  const collectors = new Set(epochs.map(({ collector }) => collector));
  return (
    isScenario(scenario) &&
    new Set(epochs.map(({ load }) => load)).size === 1 &&
    collectors.has('full') &&
    collectors.has('endpoints')
  );
}

function isLoadsCrosscheck({ scenario, epochs }: CrosscheckSummary): boolean {
  const loads = new Set(epochs.map(({ load }) => load));
  return (
    scenario === LOAD_SCENARIO &&
    CROSSCHECK_LOADS.every((load) => loads.has(load))
  );
}

function crosscheckGates(
  metric: ComparedMetric,
  source: CrosscheckSummary
): GateResult[] {
  const gate = (name: string, outcome: ValidationOutcome) => ({
    source: source.folder,
    gate: `${source.scenario}: ${name}`,
    outcome,
  });
  const common = [
    gate(
      `the result has ${source.epochs.length} epoch results`,
      source.epochs.length > 0 ? 'passed' : 'not validated'
    ),
    gate(
      'the thermal state stayed Nominal',
      source.thermalState === 0 ? 'passed' : 'not validated'
    ),
  ];
  const field = CROSSCHECK_CPU_FIELDS[metric];
  if (field === undefined) {
    return [gate(`no cross-check measures ${metric}`, 'not validated')];
  }
  return [
    ...common,
    gate('the planned loads ran', source.loadsRan ? 'passed' : 'failed'),
    ...source.epochs.map((epoch, index) =>
      gate(
        `epoch ${index} (${epoch.load}, ${epoch.collector}): ${metric} against \`thread-state\``,
        epoch[field] ? 'passed' : 'failed'
      )
    ),
  ];
}

function observerCostGate(
  metric: ComparedMetric,
  source: ObserverCostSummary
): GateResult {
  return {
    source: source.folder,
    gate: `${source.scenario}: observer cost of ${metric} (${source.blocks} blocks)`,
    outcome:
      source.blocks < MINIMUM_BLOCKS
        ? 'not validated'
        : (source.outcomes[metric as ObserverCostMetric] ?? 'not validated'),
  };
}
