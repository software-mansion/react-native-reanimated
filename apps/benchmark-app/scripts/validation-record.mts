import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type { ValidationRecordOptions } from './arguments.mts';
import { ToolError } from './errors.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import { readJson } from './json-file.mts';
import { COMPARISON_RULES } from './metrics.mts';
import type { ComparedMetric } from './metrics.mts';
import { MINIMUM_BLOCKS } from './observer-cost.mts';
import type {
  ObserverCostLimits,
  ObserverCostMetric,
  ValidationOutcome,
} from './observer-cost.mts';
import { isScenario } from './scenarios.mts';
import {
  STORED_CROSSCHECK,
  STORED_EARLIER_CROSSCHECK,
  STORED_KNOWN_WORK,
  STORED_OBSERVER_COST,
  completeBlocks,
  derivedKnownWork,
  derivedObserverCosts,
  identityDifferences,
  identityOf,
  readCrosscheckResult,
  readEarlierCrosscheck,
  readKnownWorkResult,
  readObserverCostResult,
} from './validation-sources.mts';
import type {
  CrosscheckResult,
  EarlierCrosscheck,
  KnownWorkResult,
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
import type { NoiseLimits } from './verdict.mts';

export interface GateResult {
  source: string;
  gate: string;
  outcome: ValidationOutcome;
}

export interface MetricValidation {
  validated: boolean;
  gates: GateResult[];
}

interface KnownWorkSummary {
  folder: string;
  thermalState: number;
  gates: { name: string; passes: boolean }[];
}

interface ObserverCostSummary {
  folder: string;
  scenario: string;
  blocks: number;
  outcomes: Partial<Record<ObserverCostMetric, ValidationOutcome>>;
}

export interface ValidationSources {
  knownWorks: StoredSource<KnownWorkResult>[];
  observerCosts: StoredSource<ObserverCostResult>[];
  crosschecks: StoredSource<CrosscheckResult>[];
}

interface SourceSummaries {
  knownWorks: KnownWorkSummary[];
  observerCosts: ObserverCostSummary[];
}

export interface ValidationRecord extends ValidationIdentity {
  formatVersion: typeof VALIDATION_FORMAT_VERSION;
  sources: ValidationSources;
  earlierCrosschecks: StoredSource<EarlierCrosscheck>[];
  metrics: Partial<Record<ComparedMetric, MetricValidation>>;
}

export interface MetricValidity {
  validated: ComparedMetric[];
  reason: string | null;
}

export const VALIDATION_FORMAT_VERSION = 5;

const INSTRUCTION_METRIC: ComparedMetric = 'processInstructionRate';

const IDLE_SCENARIO = 'idle-cost';

const OUTCOME = oneOf(['passed', 'failed', 'not validated']);

const RECORD_SHAPE: Check = shape({
  formatVersion: oneOf([VALIDATION_FORMAT_VERSION]),
  platform: oneOf(['ios']),
  device: shape({ model: aString, deviceId: aString, osBuild: aString }),
  measurementRevision: anInteger,
  appBuild: aString,
  sources: shape({
    knownWorks: listOf(STORED_KNOWN_WORK),
    observerCosts: listOf(STORED_OBSERVER_COST),
    crosschecks: listOf(STORED_CROSSCHECK),
  }),
  earlierCrosschecks: listOf(STORED_EARLIER_CROSSCHECK),
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

export function validationRecordCommand(
  options: ValidationRecordOptions
): number {
  const record = buildValidationRecord(
    {
      knownWorks: options.knownWorks.map((folder) =>
        readKnownWorkResult(path.resolve(folder))
      ),
      observerCosts: options.observerCosts.map((folder) =>
        readObserverCostResult(path.resolve(folder))
      ),
      crosschecks: options.crosschecks.map((folder) =>
        readCrosscheckResult(path.resolve(folder))
      ),
    },
    options.earlierCrosschecks.map((folder) =>
      readEarlierCrosscheck(path.resolve(folder))
    )
  );
  console.log(JSON.stringify(record, null, 2));
  return 0;
}

export function buildValidationRecord(
  sources: ValidationSources,
  earlierCrosschecks: readonly StoredSource<EarlierCrosscheck>[] = []
): ValidationRecord {
  const identity = commonIdentity(allSources(sources));
  throwProblems(
    'The validation record cannot be made',
    repeatedSources(sources)
  );
  return {
    formatVersion: VALIDATION_FORMAT_VERSION,
    ...identity,
    sources,
    earlierCrosschecks: [...earlierCrosschecks],
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
  candidates: readonly ComparedMetric[],
  runNoiseLimits: NoiseLimits
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
  const validations = metricValidations(record.sources, (scenario) =>
    runObserverCostLimits(runNoiseLimits, scenario)
  );
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

function runObserverCostLimits(
  runNoiseLimits: NoiseLimits,
  scenario: string
): ObserverCostLimits {
  const limits = isScenario(scenario) ? runNoiseLimits[scenario] : undefined;
  return Object.fromEntries(
    IOS_DEFINITION.verdictMetrics.map((metric) => [
      metric,
      limits?.[metric] ?? COMPARISON_RULES[metric].noiseFloor,
    ])
  );
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
  if (first.measurementRevision !== IOS_DEFINITION.measurementRevision) {
    throw new ToolError(
      `${sources[0].folder} is of the measurement revision ${first.measurementRevision}. This driver has the revision ${IOS_DEFINITION.measurementRevision}, and a source of another revision is not validation evidence for it.`
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
    ...(record.measurementRevision === IOS_DEFINITION.measurementRevision
      ? []
      : [
          `it is of the measurement revision ${record.measurementRevision}, and this driver has the revision ${IOS_DEFINITION.measurementRevision}`,
        ]),
    ...repeatedSources(record.sources),
    ...sourcesOfOtherSetups(record),
    ...inconsistentMetrics(record),
  ];
}

function allSources(
  sources: ValidationSources
): StoredSource<ValidationIdentity>[] {
  return [
    ...sources.knownWorks,
    ...sources.observerCosts,
    ...sources.crosschecks,
  ];
}

function repeatedSources(sources: ValidationSources): string[] {
  const repeated = (values: readonly string[]) =>
    values.filter((value, i) => values.indexOf(value) !== i);
  const all = allSources(sources);
  const { crosschecks } = sources;
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
  return allSources(record.sources)
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
  sources: ValidationSources,
  noiseLimitsOf?: (scenario: string) => ObserverCostLimits
): Partial<Record<ComparedMetric, MetricValidation>> {
  const summaries = summariesOf(sources, noiseLimitsOf);
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
    ...summaries.knownWorks.flatMap((summary) =>
      knownWorkGates(metric, summary)
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

function summariesOf(
  sources: ValidationSources,
  noiseLimitsOf?: (scenario: string) => ObserverCostLimits
): SourceSummaries {
  return {
    knownWorks: sources.knownWorks.map(knownWorkSummary),
    observerCosts: sources.observerCosts.map((source) =>
      observerCostSummary(source, noiseLimitsOf?.(source.result.scenario))
    ),
  };
}

function knownWorkSummary({
  folder,
  result,
}: StoredSource<KnownWorkResult>): KnownWorkSummary {
  const { thermalState, gates } = derivedKnownWork(result);
  return {
    folder,
    thermalState,
    gates: gates.map(({ name, passes }) => ({ name, passes })),
  };
}

function observerCostSummary(
  { folder, result }: StoredSource<ObserverCostResult>,
  noiseLimits?: ObserverCostLimits
): ObserverCostSummary {
  return {
    folder,
    scenario: result.scenario,
    blocks: completeBlocks(result.samples),
    outcomes: Object.fromEntries(
      derivedObserverCosts(result, noiseLimits).map((cost) => [
        cost.metric,
        cost.outcome,
      ])
    ),
  };
}

function coverageGates({
  knownWorks,
  observerCosts,
}: SourceSummaries): GateResult[] {
  const gate = (name: string, covered: boolean): GateResult => ({
    source: 'all',
    gate: name,
    outcome: covered ? 'passed' : 'not validated',
  });
  return [
    gate('a known-work test', knownWorks.length > 0),
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

function knownWorkGates(
  metric: ComparedMetric,
  source: KnownWorkSummary
): GateResult[] {
  const gate = (name: string, outcome: ValidationOutcome) => ({
    source: source.folder,
    gate: `known-work: ${name}`,
    outcome,
  });
  if (metric !== INSTRUCTION_METRIC) {
    return [gate(`no known-work test measures ${metric}`, 'not validated')];
  }
  return [
    gate(
      'the thermal state stayed Nominal',
      source.thermalState === 0 ? 'passed' : 'not validated'
    ),
    ...source.gates.map(({ name, passes }) =>
      gate(name, passes ? 'passed' : 'failed')
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
