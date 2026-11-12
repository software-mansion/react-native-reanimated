import { ToolError } from './errors.mts';
import { METRIC_COMPARISONS, verdictMetricsOf } from './metrics.mts';
import type { VerdictMetric } from './metrics.mts';
import type { Scenario } from './scenarios.mts';
import {
  benjaminiHochberg,
  bootstrapDraws,
  bootstrapInterval,
  difference,
  median,
  rankSumPValue,
} from './statistics.mts';
import type { BootstrapDraws, Comparison, Interval } from './statistics.mts';

export type Verdict = 'better' | 'worse' | 'no change found';

export type NoiseLimits = Partial<
  Record<Scenario, Partial<Record<VerdictMetric, number>>>
>;

export interface VerdictRow {
  scenario: Scenario;
  metric: VerdictMetric;
  samplesA: number;
  samplesB: number;
  medianA: number;
  medianB: number;
  comparison: Comparison;
  comparisonFallback: boolean;
  difference: number;
  interval: Interval;
  pValue: number;
  passesFalseDiscovery: boolean;
  noiseLimit: number | null;
  verdict: Verdict;
}

export type MetricValues = (
  scenario: Scenario,
  metric: VerdictMetric,
  variant: 'a' | 'b'
) => number[];

export const FALSE_DISCOVERY_RATE = 0.05;

export const MISSING_ROW_P_VALUE = 1;

export function computeVerdictRows(
  scenarios: readonly Scenario[],
  valuesOf: MetricValues,
  noiseLimits: NoiseLimits,
  scenariosWithoutRows: readonly Scenario[] = []
): VerdictRow[] {
  const rows = scenarios.flatMap((scenario) =>
    verdictMetricsOf(scenario).map((metric) =>
      compareMetric(
        scenario,
        metric,
        valuesOf(scenario, metric, 'a'),
        valuesOf(scenario, metric, 'b')
      )
    )
  );
  const missingPValues = scenariosWithoutRows.flatMap((scenario) =>
    verdictMetricsOf(scenario).map(() => MISSING_ROW_P_VALUE)
  );
  const passes = benjaminiHochberg(
    [...rows.map((row) => row.pValue), ...missingPValues],
    FALSE_DISCOVERY_RATE
  );
  return rows.map((row, i) => {
    const noiseLimit = noiseLimitOf(
      row,
      noiseLimits[row.scenario]?.[row.metric] ?? 0
    );
    const decided = { ...row, passesFalseDiscovery: passes[i], noiseLimit };
    return { ...decided, verdict: verdictOf(decided) };
  });
}

function compareMetric(
  scenario: Scenario,
  metric: VerdictMetric,
  a: number[],
  b: number[]
) {
  const medianA = median(a);
  const medianB = median(b);
  const draws = bootstrapDraws(a, b);
  const comparisonFallback =
    METRIC_COMPARISONS[metric] === 'relative' &&
    !relativeDifferenceIsDefined(medianA, draws);
  const comparison = comparisonFallback
    ? 'absolute'
    : METRIC_COMPARISONS[metric];
  const row = {
    scenario,
    metric,
    samplesA: a.length,
    samplesB: b.length,
    medianA,
    medianB,
    comparison,
    comparisonFallback,
    difference: difference(medianA, medianB, comparison),
    interval: bootstrapInterval(draws, comparison),
    pValue: rankSumPValue(a, b),
  };
  checkFinite(row);
  return row;
}

function noiseLimitOf(
  row: Pick<VerdictRow, 'comparisonFallback' | 'medianA'>,
  limit: number
): number | null {
  if (!row.comparisonFallback) {
    return limit;
  }
  return row.medianA > 0 ? limit * row.medianA : null;
}

function relativeDifferenceIsDefined(
  medianA: number,
  draws: BootstrapDraws
): boolean {
  return medianA > 0 && draws.mediansA.every((drawMedian) => drawMedian > 0);
}

function checkFinite(
  row: Pick<
    VerdictRow,
    | 'scenario'
    | 'metric'
    | 'medianA'
    | 'medianB'
    | 'difference'
    | 'interval'
    | 'pValue'
  >
) {
  const values = [
    row.medianA,
    row.medianB,
    row.difference,
    row.interval.low,
    row.interval.high,
    row.pValue,
  ];
  if (!values.every(Number.isFinite)) {
    throw new ToolError(
      `The statistics of ${row.scenario}, ${row.metric} are not finite numbers (medians ${row.medianA} and ${row.medianB}, difference ${row.difference}, interval ${row.interval.low} to ${row.interval.high}, p-value ${row.pValue})`
    );
  }
}

function verdictOf(row: Omit<VerdictRow, 'verdict'>): Verdict {
  const excludesZero = row.interval.low > 0 || row.interval.high < 0;
  const beyondNoise = Math.abs(row.difference) > (row.noiseLimit ?? 0);
  const bothZero = row.medianA === 0 && row.medianB === 0;
  if (bothZero || !excludesZero || !row.passesFalseDiscovery || !beyondNoise) {
    return 'no change found';
  }
  return row.difference < 0 ? 'better' : 'worse';
}
