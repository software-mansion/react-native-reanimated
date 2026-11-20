import type { Expectation } from './config.mts';
import type { ComparedMetric } from './metrics.mts';
import type { Scenario } from './scenarios.mts';
import type { FailedScenario } from './session.mts';
import type { VerdictRow } from './verdict.mts';

export type ExpectationStatus = 'holds' | 'fails' | 'not decided';

export interface ExpectationResult {
  expectation: Expectation;
  status: ExpectationStatus;
  rows: VerdictRow[];
  decidingRows: VerdictRow[];
  failedScenarios: FailedScenario[];
  scenariosWithoutData: Scenario[];
  unvalidatedMetrics: ComparedMetric[];
}

export function evaluateExpectations(
  expectations: readonly Expectation[],
  rows: readonly VerdictRow[],
  failedScenarios: readonly FailedScenario[],
  scenariosWithoutData: readonly Scenario[] = [],
  unvalidatedMetrics: readonly ComparedMetric[] = []
): ExpectationResult[] {
  return expectations.map((expectation) =>
    evaluateExpectation(
      expectation,
      rows,
      failedScenarios,
      scenariosWithoutData,
      unvalidatedMetrics
    )
  );
}

export function exitCodeOf(results: readonly ExpectationResult[]): 0 | 1 {
  return results.every((result) => result.status === 'holds') ? 0 : 1;
}

function evaluateExpectation(
  expectation: Expectation,
  allRows: readonly VerdictRow[],
  allFailedScenarios: readonly FailedScenario[],
  allScenariosWithoutData: readonly Scenario[],
  unvalidatedMetrics: readonly ComparedMetric[]
): ExpectationResult {
  const rows = allRows.filter(
    (row) =>
      expectation.scenarios.includes(row.scenario) &&
      expectation.metrics.includes(row.metric)
  );
  const failedScenarios = allFailedScenarios.filter((failed) =>
    expectation.scenarios.includes(failed.scenario)
  );
  const scenariosWithoutData = allScenariosWithoutData.filter((scenario) =>
    expectation.scenarios.includes(scenario)
  );
  const unvalidated = expectation.metrics.filter((metric) =>
    unvalidatedMetrics.includes(metric)
  );
  const result = (status: ExpectationStatus, decidingRows: VerdictRow[]) => ({
    expectation,
    status,
    rows,
    decidingRows,
    failedScenarios,
    scenariosWithoutData,
    unvalidatedMetrics: unvalidated,
  });

  const failingRows = rows.filter((row) => rowFails(expectation, row));
  if (
    failingRows.length > 0 ||
    failedScenarios.some((failed) => failed.variants.includes('b'))
  ) {
    return result('fails', failingRows);
  }
  if (
    failedScenarios.length > 0 ||
    scenariosWithoutData.length > 0 ||
    unvalidated.length > 0
  ) {
    return result('not decided', []);
  }
  if (expectation.is === 'notWorse') {
    return result('holds', []);
  }
  const undecidedRows = rows.filter((row) => !rowHolds(expectation, row));
  return undecidedRows.length > 0
    ? result('not decided', undecidedRows)
    : result('holds', []);
}

function rowFails(expectation: Expectation, row: VerdictRow): boolean {
  if (row.verdict === 'worse') {
    return true;
  }
  return (
    expectation.is === 'better' &&
    expectation.byAtLeast !== undefined &&
    row.comparison === 'relative' &&
    row.interval.low > -expectation.byAtLeast
  );
}

function rowHolds(expectation: Expectation, row: VerdictRow): boolean {
  if (row.verdict !== 'better') {
    return false;
  }
  if (expectation.byAtLeast === undefined) {
    return true;
  }
  return (
    row.comparison === 'relative' && row.interval.high <= -expectation.byAtLeast
  );
}
