import { ToolError } from './errors.mts';
import { COMPARISON_RULES } from './metrics.mts';
import type { ComparedMetric } from './metrics.mts';
import type { PlatformDefinition } from './platform.mts';
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
  Record<Scenario, Partial<Record<ComparedMetric, number>>>
>;

export interface MetricComparison {
  scenario: Scenario;
  metric: ComparedMetric;
  samplesA: number;
  samplesB: number;
  medianA: number;
  medianB: number;
  comparison: Comparison;
  comparisonFallback: boolean;
  difference: number;
  interval: Interval;
}

export interface VerdictRow extends MetricComparison {
  pValue: number;
  passesFalseDiscovery: boolean;
  noiseLimit: number | null;
  verdict: Verdict;
}

export type AdvisoryRow = (
  | (MetricComparison & { hasData: true })
  | {
      scenario: Scenario;
      metric: ComparedMetric;
      samplesA: number;
      samplesB: number;
      hasData: false;
    }
) & { unvalidated?: true };

export interface ComparisonRows {
  verdictRows: VerdictRow[];
  advisoryRows: AdvisoryRow[];
}

export type MetricValues = (
  scenario: Scenario,
  metric: ComparedMetric,
  variant: 'a' | 'b'
) => number[];

const FALSE_DISCOVERY_RATE = 0.05;

const MISSING_ROW_P_VALUE = 1;

export function computeComparisonRows(
  definition: PlatformDefinition,
  scenarios: readonly Scenario[],
  valuesOf: MetricValues,
  noiseLimits: NoiseLimits,
  scenariosWithoutRows: readonly Scenario[] = [],
  unvalidatedMetrics: readonly ComparedMetric[] = []
): ComparisonRows {
  const comparedRow = (scenario: Scenario, metric: ComparedMetric) =>
    advisoryRow(
      scenario,
      metric,
      valuesOf(scenario, metric, 'a'),
      valuesOf(scenario, metric, 'b')
    );
  return {
    verdictRows: computeVerdictRows(
      definition.verdictMetrics.filter(
        (metric) => !unvalidatedMetrics.includes(metric)
      ),
      scenarios,
      valuesOf,
      noiseLimits,
      scenariosWithoutRows
    ),
    advisoryRows: scenarios.flatMap((scenario) => [
      ...unvalidatedMetrics.map((metric) => ({
        ...comparedRow(scenario, metric),
        unvalidated: true as const,
      })),
      ...definition.advisoryMetrics.map((metric) =>
        comparedRow(scenario, metric)
      ),
    ]),
  };
}

function computeVerdictRows(
  metrics: readonly ComparedMetric[],
  scenarios: readonly Scenario[],
  valuesOf: MetricValues,
  noiseLimits: NoiseLimits,
  scenariosWithoutRows: readonly Scenario[]
): VerdictRow[] {
  const rows = scenarios.flatMap((scenario) =>
    metrics.map((metric) => {
      const a = valuesOf(scenario, metric, 'a');
      const b = valuesOf(scenario, metric, 'b');
      const row = compareMetric(scenario, metric, a, b);
      const pValue = rankSumPValue(a, b);
      checkFinite(row, pValue);
      return { ...row, pValue };
    })
  );
  const missingPValues = scenariosWithoutRows.flatMap(() =>
    metrics.map(() => MISSING_ROW_P_VALUE)
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
  metric: ComparedMetric,
  a: number[],
  b: number[]
): MetricComparison {
  const medianA = median(a);
  const medianB = median(b);
  const draws = bootstrapDraws(a, b);
  const metricComparison = COMPARISON_RULES[metric].comparison;
  const comparisonFallback =
    metricComparison === 'relative' &&
    !relativeDifferenceIsDefined(medianA, draws);
  const comparison = comparisonFallback ? 'absolute' : metricComparison;
  return {
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
  };
}

function relativeDifferenceIsDefined(
  medianA: number,
  draws: BootstrapDraws
): boolean {
  return medianA > 0 && draws.mediansA.every((drawMedian) => drawMedian > 0);
}

function checkFinite(row: MetricComparison, pValue?: number) {
  const values = [
    row.medianA,
    row.medianB,
    row.difference,
    row.interval.low,
    row.interval.high,
    ...(pValue === undefined ? [] : [pValue]),
  ];
  if (!values.every(Number.isFinite)) {
    throw new ToolError(
      `The statistics of ${row.scenario}, ${row.metric} are not finite numbers (medians ${row.medianA} and ${row.medianB}, difference ${row.difference}, interval ${row.interval.low} to ${row.interval.high}, p-value ${pValue ?? '-'})`
    );
  }
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

function verdictOf(row: Omit<VerdictRow, 'verdict'>): Verdict {
  const excludesZero = row.interval.low > 0 || row.interval.high < 0;
  const beyondNoise = Math.abs(row.difference) > (row.noiseLimit ?? 0);
  const bothZero = row.medianA === 0 && row.medianB === 0;
  if (bothZero || !excludesZero || !row.passesFalseDiscovery || !beyondNoise) {
    return 'no change found';
  }
  return row.difference < 0 ? 'better' : 'worse';
}

function advisoryRow(
  scenario: Scenario,
  metric: ComparedMetric,
  a: number[],
  b: number[]
): AdvisoryRow {
  if (a.length === 0 || b.length === 0) {
    return {
      scenario,
      metric,
      samplesA: a.length,
      samplesB: b.length,
      hasData: false,
    };
  }
  const row = compareMetric(scenario, metric, a, b);
  checkFinite(row);
  return { ...row, hasData: true };
}
