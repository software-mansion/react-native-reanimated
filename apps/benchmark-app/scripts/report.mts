import type {
  PackageSource,
  RunConfig,
  VariantKey,
  VariantsConfig,
} from './config.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import type { ExpectationResult } from './expectations.mts';
import { COMPARED_METRICS, COMPARISON_RULES } from './metrics.mts';
import type { ComparedMetric, MetricUnit } from './metrics.mts';
import type { NoiseLimitsRecord } from './noise-limits-record.mts';
import type { DeviceState, PlatformDefinition } from './platform.mts';
import { finiteNumber, scenariosWithoutData } from './results.mts';
import type { MeasurementResult, RunResult, Segment } from './results.mts';
import { SAMPLE_INVALID_CAUSES, SAMPLE_STEPS } from './samples.mts';
import type { InvalidCause, SampleSteps } from './samples.mts';
import type {
  FailedScenario,
  Judged,
  Recorded,
  ScenarioOutcome,
} from './session.mts';
import type { BuiltVariant } from './variant-build.mts';
import type { AdvisoryRow, MetricComparison, VerdictRow } from './verdict.mts';

export interface Difference {
  field: string;
  a: string;
  b: string;
}

type Timed = Judged & { timings: SampleSteps['timings'] };

export function renderReport(result: RunResult): string {
  const definition = PLATFORM_DEFINITIONS[result.platform];
  const samples = [
    ...result.scenarios,
    ...(result.incompleteScenario ? [result.incompleteScenario] : []),
    ...result.abandonedScenarios,
  ].flatMap((outcome) => outcome.samples);
  const failed = result.scenarios.flatMap((outcome) =>
    outcome.failed ? [outcome.failed] : []
  );
  return [
    `# Benchmark ${result.config.name}`,
    '',
    ...(result.status === 'done' ? [] : [incompleteNote(result), '']),
    `Started ${result.startedAt}. Finished ${result.finishedAt ?? '-'}. Blocks for each scenario: ${blocksText(result)}.`,
    ...(result.config.note ? ['', result.config.note] : []),
    '',
    '## Differences between A and B',
    '',
    differencesSection(result),
    '',
    '## Expectations',
    '',
    expectationsSection(result.expectations, result.config, definition),
    '',
    '## Verdicts',
    '',
    verdictsSection(result),
    '',
    '## Metric definitions',
    '',
    metricDefinitionsSection(definition, result.measurementRevision),
    '',
    '## Failed scenarios',
    '',
    failedSection(failed),
    '',
    '## Device',
    '',
    deviceSection(result.segments[0].device),
    '',
    '## Segments',
    '',
    segmentsSection(result, 'block'),
    '',
    '## Invalid samples',
    '',
    invalidSection(samples),
    '',
    '## Time for each sample (mean)',
    '',
    timingSection(samples),
    '',
  ].join('\n');
}

export function differencesSection(result: MeasurementResult<Judged>): string {
  const differences = variantDifferences(result.config, result.variants);
  if (differences.length === 0) {
    return 'A and B have the same sources, flags and build options.';
  }
  return table(
    ['Field', 'A', 'B'],
    differences.map((row) => [row.field, row.a, row.b])
  );
}

export function variantDifferences(
  config: VariantsConfig,
  variants: Partial<Record<VariantKey, BuiltVariant>>
): Difference[] {
  const { a, b } = config;
  const rows: Difference[] = [
    {
      field: 'reanimated source',
      a: describeSource(a.reanimated),
      b: describeSource(b.reanimated),
    },
    {
      field: 'worklets source',
      a: describeSource(a.worklets),
      b: describeSource(b.worklets),
    },
    {
      field: 'reanimated version',
      a: variants.a?.installedVersions.reanimated ?? '-',
      b: variants.b?.installedVersions.reanimated ?? '-',
    },
    {
      field: 'worklets version',
      a: variants.a?.installedVersions.worklets ?? '-',
      b: variants.b?.installedVersions.worklets ?? '-',
    },
    ...flagDifferences(
      'reanimated',
      variants.a?.effectiveFlags.reanimated ?? {},
      variants.b?.effectiveFlags.reanimated ?? {}
    ),
    ...flagDifferences(
      'worklets',
      variants.a?.effectiveFlags.worklets ?? {},
      variants.b?.effectiveFlags.worklets ?? {}
    ),
    { field: 'bundleMode', a: String(a.bundleMode), b: String(b.bundleMode) },
    { field: 'profiling', a: String(a.profiling), b: String(b.profiling) },
  ];
  return rows.filter((row) => row.a !== row.b);
}

export function counted(
  count: number,
  singular: string,
  plural: string
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function table(header: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(header), line(header.map(() => '---')), ...rows.map(line)].join(
    '\n'
  );
}

export function metricDefinitionsTable(
  definition: PlatformDefinition,
  entries = definition.metricDefinitions
): string {
  return table(
    ['Metric', 'Unit', 'Source', 'Interval', 'Limits', 'Verdict'],
    entries.map((entry) => [
      entry.names.map((name) => `\`${name}\``).join(', '),
      entry.unit,
      entry.source,
      entry.interval,
      entry.limits,
      roleOf(definition, entry.names),
    ])
  );
}

export function failedSection(
  failed: FailedScenario[],
  attempts = 'blocks'
): string {
  if (failed.length === 0) {
    return 'None.';
  }
  return failed
    .map((scenario) => {
      const causes = scenario.causes.map(
        (cause) =>
          `${cause.variant.toUpperCase()}: ${cause.cause}, ${cause.detail}`
      );
      return `- ${scenario.scenario} failed on ${failedVariants(scenario)}. Last ${causes.length} invalid ${attempts}: ${causes.join('; ')}.`;
    })
    .join('\n');
}

export function deviceSection(device: DeviceState): string {
  return table(
    ['Key', 'Value at session start'],
    Object.entries(device).map(([key, value]) => [key, String(value)])
  );
}

export function segmentsSection(
  result: MeasurementResult<Judged>,
  unitName: string
): string {
  const lines = [
    ...result.scenarios,
    ...(result.incompleteScenario ? [result.incompleteScenario] : []),
  ].flatMap((outcome) => roundSegmentsLine(outcome, unitName));
  return [
    segmentsTable(
      result.segments,
      PLATFORM_DEFINITIONS[result.platform].segmentColumns
    ),
    ...(lines.length > 0 ? ['', ...lines] : []),
  ].join('\n');
}

export function invalidSection(
  samples: Recorded<Judged>[],
  causes: readonly InvalidCause[] = SAMPLE_INVALID_CAUSES
): string {
  return table(
    ['Cause', 'Samples'],
    causes.map((cause) => [
      cause,
      String(
        samples.filter((sample) => !sample.valid && sample.cause === cause)
          .length
      ),
    ])
  );
}

export function timingSection(samples: Recorded<Timed>[]): string {
  return table(
    ['Step', 'Mean'],
    SAMPLE_STEPS.map((step) => {
      const times = samples.flatMap((sample) =>
        sample.timings[step] === undefined ? [] : [sample.timings[step]]
      );
      const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
      return [step, times.length > 0 ? `${(mean / 1000).toFixed(1)} s` : '-'];
    })
  );
}

function incompleteNote(result: RunResult): string {
  return `This run is not complete (status: ${result.status}). Scenarios without data: ${scenariosWithoutData(result, result.config.scenarios).join(', ') || 'none'}. The verdicts and the expectations are provisional.`;
}

function blocksText(result: RunResult): string {
  const overrides = Object.entries(result.config.blocks ?? {}).map(
    ([scenario, blocks]) => `${scenario}: ${blocks}`
  );
  return overrides.length > 0
    ? `${result.options.blocks} (${overrides.join(', ')})`
    : String(result.options.blocks);
}

function expectationsSection(
  results: ExpectationResult[],
  config: RunConfig,
  definition: PlatformDefinition
): string {
  return results
    .map((result, i) => expectationLine(result, i, config, definition))
    .join('\n');
}

function expectationLine(
  result: ExpectationResult,
  index: number,
  config: RunConfig,
  definition: PlatformDefinition
): string {
  const { expectation } = result;
  const scenarios = config.scenarios.every((scenario) =>
    expectation.scenarios.includes(scenario)
  )
    ? 'all scenarios'
    : expectation.scenarios.join(', ');
  const metrics = definition.verdictMetrics.every((metric) =>
    expectation.metrics.includes(metric)
  )
    ? 'all metrics'
    : expectation.metrics.join(', ');
  const claim =
    expectation.is === 'notWorse'
      ? 'not worse'
      : `better${expectation.byAtLeast === undefined ? '' : ` by at least ${formatPercent(expectation.byAtLeast, false)}`}`;
  const rowDetail = (row: VerdictRow) =>
    `${formatDifference(row)}, interval ${formatInterval(row)}`;
  const details = [
    ...(result.rows.length === 1
      ? [rowDetail(result.rows[0])]
      : result.decidingRows.map(
          (row) => `${row.scenario}, ${row.metric}: ${rowDetail(row)}`
        )),
    ...result.failedScenarios.map(
      (failed) => `${failed.scenario} failed on ${failedVariants(failed)}`
    ),
    ...result.scenariosWithoutData.map((scenario) => `${scenario} has no data`),
  ];
  const detail = details.length > 0 ? ` (${details.join('; ')})` : '';
  return `${index + 1}. ${scenarios}, ${metrics}: ${claim} -> ${result.status}${detail}`;
}

function formatPercent(fraction: number, signed: boolean): string {
  const percent = (finiteNumber(fraction, 'A percentage') * 100)
    .toFixed(1)
    .replace(/\.0$/, '');
  return `${signed && fraction > 0 ? '+' : ''}${percent === '-0' ? '0' : percent}%`;
}

function formatDifference(
  row: MetricComparison & { noiseLimit?: number | null }
): string {
  if (row.comparison === 'relative') {
    return formatPercent(row.difference, true);
  }
  const value = formatSigned(row.difference, unitOf(row.metric));
  if (!row.comparisonFallback) {
    return value;
  }
  return row.noiseLimit === null
    ? `${value} (absolute, no noise limit)`
    : `${value} (absolute)`;
}

function formatSigned(value: number, unit: MetricUnit): string {
  const sign = value > 0 ? '+' : '';
  return unit === 'share'
    ? `${sign}${(finiteNumber(value, 'A value in the report') * 100).toFixed(2)} pp`
    : `${sign}${formatValue(value, unit)}`;
}

function formatValue(value: number, unit: MetricUnit): string {
  const finite = finiteNumber(value, 'A value in the report');
  switch (unit) {
    case 'share':
      return `${(finite * 100).toFixed(1)}% of frames`;
    case 'kB':
      return `${Math.round(finite)} kB`;
    default:
      return `${finite.toFixed(2)} ${unit}`;
  }
}

function unitOf(metric: ComparedMetric): MetricUnit {
  return COMPARISON_RULES[metric].unit;
}

function formatInterval(row: MetricComparison): string {
  const format = (value: number) =>
    row.comparison === 'relative'
      ? formatPercent(value, true)
      : formatSigned(value, unitOf(row.metric));
  return `${format(row.interval.low)} to ${format(row.interval.high)}`;
}

function failedVariants(failed: FailedScenario): string {
  return failed.variants.map((variant) => variant.toUpperCase()).join(' and ');
}

function verdictsSection(result: RunResult): string {
  const limits = [
    ...(result.status === 'done'
      ? []
      : ['Provisional: the run is not complete.']),
    result.noiseLimits
      ? noiseLimitsText(result.noiseLimits, result.options.noiseLimitsFile)
      : 'This run is uncalibrated: it has no noise limits file, so the noise limit of each row is 0.',
    'The difference and the interval of jankyFrames are in percentage points (pp). A row with "no verdict" is advisory: it has no noise limit, and the expectations do not use it.',
  ].join(' ');
  const rows = [...result.verdictRows, ...result.advisoryRows].sort(
    (left, right) =>
      result.config.scenarios.indexOf(left.scenario) -
        result.config.scenarios.indexOf(right.scenario) ||
      COMPARED_METRICS.indexOf(left.metric) -
        COMPARED_METRICS.indexOf(right.metric)
  );
  if (rows.length === 0) {
    return `${limits}\n\nNo rows.`;
  }
  const hasFallback = rows.some(
    (row) => hasComparison(row) && row.comparisonFallback
  );
  return [
    limits,
    '',
    table(
      [
        'Scenario',
        'Metric',
        'Samples A/B',
        'Median A',
        'Median B',
        'Difference',
        'Interval',
        'Verdict',
      ],
      rows.map(comparisonCells)
    ),
    ...(hasFallback
      ? [
          '',
          '(absolute) The relative difference is not defined for this row: the median of A, or the median of A in a bootstrap draw, is 0 or less. The difference and the interval are absolute values in the unit of the metric. When the median of A is above 0, the noise limit of the row is the relative limit times the median of A, in the unit of the metric. When the median of A is 0 or less, the row has no noise limit.',
        ]
      : []),
  ].join('\n');
}

function noiseLimitsText(
  limits: NoiseLimitsRecord,
  file: string | null
): string {
  const { device } = limits;
  return `Noise limits from ${file}: ${device.model}, device ${device.deviceId}, OS build ${device.osBuild}, measurement revision ${limits.measurementRevision}, ${counted(limits.sources.length, 'A/A run', 'A/A runs')}. A limit is a fraction for a relative metric and a value in the unit of the metric for an absolute metric (jankyFrames, a share of frames: 0.005 is 0.5 percentage points). A row with no limit in the file has the limit 0.`;
}

function hasComparison(
  row: VerdictRow | AdvisoryRow
): row is VerdictRow | Extract<AdvisoryRow, { hasData: true }> {
  return !('hasData' in row) || row.hasData;
}

function comparisonCells(row: VerdictRow | AdvisoryRow): string[] {
  const place = [row.scenario, row.metric, `${row.samplesA}/${row.samplesB}`];
  if (!hasComparison(row)) {
    return [...place, '-', '-', '-', '-', 'no verdict (no data)'];
  }
  const unit = unitOf(row.metric);
  return [
    ...place,
    formatValue(row.medianA, unit),
    formatValue(row.medianB, unit),
    formatDifference(row),
    formatInterval(row),
    'verdict' in row ? row.verdict : 'no verdict',
  ];
}

function metricDefinitionsSection(
  definition: PlatformDefinition,
  measurementRevision: number
): string {
  const shown = new Set<string>([
    ...definition.verdictMetrics,
    ...definition.advisoryMetrics,
  ]);
  return [
    `Numbers and verdicts are valid only within one platform, one phone and one measurement revision. This run has the measurement revision ${measurementRevision}.`,
    '',
    metricDefinitionsTable(
      definition,
      definition.metricDefinitions.filter((entry) =>
        entry.names.some((name) => shown.has(name))
      )
    ),
  ].join('\n');
}

function describeSource(source: PackageSource): string {
  return source.kind === 'npm' ? source.version : source.path;
}

function flagDifferences(
  library: string,
  a: Record<string, boolean>,
  b: Record<string, boolean>
): Difference[] {
  const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return names.map((name) => ({
    field: `${library} ${name}`,
    a: String(a[name] ?? '-'),
    b: String(b[name] ?? '-'),
  }));
}

function roleOf(
  definition: PlatformDefinition,
  names: readonly string[]
): string {
  const has = (metrics: readonly string[]) =>
    names.some((name) => metrics.includes(name));
  if (has(definition.verdictMetrics)) {
    return 'yes';
  }
  return has(definition.advisoryMetrics) ? 'no verdict, shown' : 'no, stored';
}

function roundSegmentsLine(
  outcome: ScenarioOutcome<Judged>,
  unitName: string
): string[] {
  const roundsBySegment = new Map<number, number[]>();
  for (const sample of outcome.samples.filter((sample) => sample.accepted)) {
    roundsBySegment.set(sample.segment, [
      ...(roundsBySegment.get(sample.segment) ?? []),
      sample.round,
    ]);
  }
  if (roundsBySegment.size < 2) {
    return [];
  }
  const parts = [...roundsBySegment]
    .sort(([first], [second]) => first - second)
    .map(
      ([segment, rounds]) =>
        `${roundRange(rounds, unitName)} in segment ${segment}`
    );
  return [`- ${outcome.scenario}: ${parts.join(', ')}.`];
}

function roundRange(rounds: number[], unitName: string): string {
  const first = Math.min(...rounds);
  const last = Math.max(...rounds);
  return first === last
    ? `${unitName} ${first}`
    : `${unitName}s ${first}-${last}`;
}

function segmentsTable(
  segments: Segment[],
  columns: PlatformDefinition['segmentColumns']
): string {
  return table(
    [
      'Segment',
      'Started',
      'Finished',
      'Status',
      ...columns.map((column) => column.title),
    ],
    segments.map((segment, i) => [
      String(i),
      segment.startedAt,
      segment.finishedAt ?? '-',
      segment.status,
      ...columns.map((column) => {
        const value = new Map(Object.entries(segment.device)).get(column.key);
        return `${String(value)}${column.unit}`;
      }),
    ])
  );
}
