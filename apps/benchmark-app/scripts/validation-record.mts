import path from 'node:path';

import type { ValidationRecordOptions } from './arguments.mts';
import { ToolError } from './errors.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import { readJson } from './json-file.mts';
import type { ComparedMetric } from './metrics.mts';
import type { ValidationOutcome } from './observer-cost.mts';
import {
  identityDifferences,
  identityOf,
  readCrosscheckResult,
  readObserverCostResult,
} from './validation-sources.mts';
import type {
  CrosscheckResult,
  ObserverCostResult,
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

export interface ValidationRecord extends ValidationIdentity {
  formatVersion: typeof VALIDATION_FORMAT_VERSION;
  sources: { crosschecks: string[]; observerCosts: string[] };
  metrics: Partial<Record<ComparedMetric, MetricValidation>>;
}

export interface MetricValidity {
  validated: ComparedMetric[];
  reason: string | null;
}

interface Source<R> {
  folder: string;
  result: R;
}

export const VALIDATION_FORMAT_VERSION = 1;

const MINIMUM_CROSSCHECKS = 2;

const MINIMUM_OBSERVER_COST_SCENARIOS = 2;

const OUTCOME = oneOf(['passed', 'failed', 'not validated']);

export const VALIDATION_RECORD: Check = shape({
  formatVersion: oneOf([VALIDATION_FORMAT_VERSION]),
  platform: oneOf(['ios']),
  device: shape({ model: aString, deviceId: aString, osBuild: aString }),
  measurementRevision: anInteger,
  appSources: aString,
  sources: shape({
    crosschecks: listOf(aString),
    observerCosts: listOf(aString),
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

const CROSSCHECK_CPU_FIELDS: Partial<
  Record<ComparedMetric, 'uiThreadCpu' | 'jsThreadCpu'>
> = {
  uiThreadCpu: 'uiThreadCpu',
  jsThreadCpu: 'jsThreadCpu',
};

export function validationRecordCommand(
  options: ValidationRecordOptions
): number {
  const crosschecks = options.crosschecks.map((folder) => ({
    folder: path.resolve(folder),
    result: readCrosscheckResult(path.resolve(folder)),
  }));
  const observerCosts = options.observerCosts.map((folder) => ({
    folder: path.resolve(folder),
    result: readObserverCostResult(path.resolve(folder)),
  }));
  console.log(
    JSON.stringify(buildValidationRecord(crosschecks, observerCosts), null, 2)
  );
  return 0;
}

export function buildValidationRecord(
  crosschecks: readonly Source<CrosscheckResult>[],
  observerCosts: readonly Source<ObserverCostResult>[]
): ValidationRecord {
  const identity = commonIdentity([...crosschecks, ...observerCosts]);
  return {
    formatVersion: VALIDATION_FORMAT_VERSION,
    ...identity,
    sources: {
      crosschecks: crosschecks.map(({ folder }) => folder),
      observerCosts: observerCosts.map(({ folder }) => folder),
    },
    metrics: Object.fromEntries(
      IOS_DEFINITION.verdictMetrics.map((metric) => [
        metric,
        metricValidation(metric, crosschecks, observerCosts),
      ])
    ),
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
      reason: 'the builds of the run do not have one hash of the app sources',
    };
  }
  const differences = identityDifferences(identityOf(record), run);
  if (differences.length > 0) {
    return {
      validated: [],
      reason: `the validation record does not fit the run: ${differences.join(', ')}`,
    };
  }
  const validated = candidates.filter(
    (metric) => record.metrics[metric]?.validated === true
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
  sources: readonly Source<ValidationIdentity>[]
): ValidationIdentity {
  if (sources.length === 0) {
    throw new ToolError('A validation record needs at least one source');
  }
  const first = identityOf(sources[0].result);
  if (first.appSources === '') {
    throw new ToolError(
      `${sources[0].folder} measured an app without a hash of its sources. Build the app with the driver.`
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

function metricValidation(
  metric: ComparedMetric,
  crosschecks: readonly Source<CrosscheckResult>[],
  observerCosts: readonly Source<ObserverCostResult>[]
): MetricValidation {
  const gates = [
    sourcesGate(crosschecks, observerCosts),
    ...crosschecks.flatMap((source) => crosscheckGates(metric, source)),
    ...observerCosts.map((source) => observerCostGate(metric, source)),
  ];
  return {
    validated: gates.every((gate) => gate.outcome === 'passed'),
    gates,
  };
}

function sourcesGate(
  crosschecks: readonly Source<CrosscheckResult>[],
  observerCosts: readonly Source<ObserverCostResult>[]
): GateResult {
  const scenarios = new Set(observerCosts.map(({ result }) => result.scenario));
  return {
    source: 'all',
    gate: `at least ${MINIMUM_CROSSCHECKS} cross-checks (here ${crosschecks.length}) and observer-cost tests of at least ${MINIMUM_OBSERVER_COST_SCENARIOS} scenarios (here ${scenarios.size})`,
    outcome:
      crosschecks.length >= MINIMUM_CROSSCHECKS &&
      scenarios.size >= MINIMUM_OBSERVER_COST_SCENARIOS
        ? 'passed'
        : 'not validated',
  };
}

function crosscheckGates(
  metric: ComparedMetric,
  { folder, result }: Source<CrosscheckResult>
): GateResult[] {
  const gate = (name: string, outcome: ValidationOutcome) => ({
    source: folder,
    gate: `${result.scenario}: ${name}`,
    outcome,
  });
  const thermal = gate(
    'the thermal state stayed Nominal',
    result.thermalState === 0 ? 'passed' : 'not validated'
  );
  if (metric === 'memory') {
    return [
      thermal,
      gate(
        '`phys_footprint` against `memory-physical-footprint` of Activity Monitor',
        result.verdict.memory === 'not available'
          ? 'not validated'
          : result.verdict.memory
      ),
    ];
  }
  const field = CROSSCHECK_CPU_FIELDS[metric];
  if (field === undefined) {
    return [gate(`no cross-check measures ${metric}`, 'not validated')];
  }
  return [
    thermal,
    gate(
      'the planned loads ran',
      result.verdict.loadsRan ? 'passed' : 'failed'
    ),
    ...result.epochs.map((epoch) =>
      gate(
        `epoch ${epoch.index} (${epoch.load}, ${epoch.collector}): ${metric} against \`thread-state\``,
        epoch[field].passes ? 'passed' : 'failed'
      )
    ),
  ];
}

function observerCostGate(
  metric: ComparedMetric,
  { folder, result }: Source<ObserverCostResult>
): GateResult {
  return {
    source: folder,
    gate: `${result.scenario}: observer cost of ${metric}`,
    outcome:
      result.costs?.find((cost) => cost.metric === metric)?.outcome ??
      'not validated',
  };
}
