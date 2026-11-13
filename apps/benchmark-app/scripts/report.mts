import type { DeviceState } from './android-device.mts';
import type {
  PackageSource,
  RunConfig,
  VariantKey,
  VariantsConfig,
} from './config.mts';
import type { ExpectationResult } from './expectations.mts';
import { METRIC_UNITS, VERDICT_METRICS } from './metrics.mts';
import type { MetricUnit } from './metrics.mts';
import { INVALID_CAUSES, SAMPLE_STEPS } from './protocol.mts';
import type { InvalidCause, SampleSteps } from './protocol.mts';
import { finiteNumber, scenariosWithoutData } from './results.mts';
import type { MeasurementResult, RunResult, Segment } from './results.mts';
import type {
  FailedScenario,
  Judged,
  Recorded,
  ScenarioOutcome,
} from './session.mts';
import type { BuiltVariant } from './variant-build.mts';
import type { VerdictRow } from './verdict.mts';

type Timed = Judged & { timings: SampleSteps['timings'] };

export interface Difference {
  field: string;
  a: string;
  b: string;
}

export function renderReport(result: RunResult): string {
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
    expectationsSection(result.expectations, result.config),
    '',
    '## Verdicts',
    '',
    verdictsSection(result),
    '',
    '## Failed scenarios',
    '',
    failedSection(failed),
    '',
    '## Device',
    '',
    deviceSection(result.serial, result.segments[0].device),
    '',
    '## Segments',
    '',
    segmentsSection(result),
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

export function table(header: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(header), line(header.map(() => '---')), ...rows.map(line)].join(
    '\n'
  );
}

function expectationsSection(
  results: ExpectationResult[],
  config: RunConfig
): string {
  return results
    .map((result, i) => expectationLine(result, i, config))
    .join('\n');
}

export function expectationLine(
  result: ExpectationResult,
  index: number,
  config: RunConfig
): string {
  const { expectation } = result;
  const scenarios = config.scenarios.every((scenario) =>
    expectation.scenarios.includes(scenario)
  )
    ? 'all scenarios'
    : expectation.scenarios.join(', ');
  const metrics = VERDICT_METRICS.every((metric) =>
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

function formatDifference(row: VerdictRow): string {
  if (row.comparison === 'relative') {
    return formatPercent(row.difference, true);
  }
  const value = formatSigned(row.difference, METRIC_UNITS[row.metric]);
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

function formatInterval(row: VerdictRow): string {
  const format = (value: number) =>
    row.comparison === 'relative'
      ? formatPercent(value, true)
      : formatSigned(value, METRIC_UNITS[row.metric]);
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
      ? `Noise limits from ${result.options.noiseLimitsFile}. A limit is a fraction for a relative metric and a value in the unit of the metric for an absolute metric (jankyFrames, a share of frames: 0.005 is 0.5 percentage points). A row with no limit in the file has the limit 0.`
      : 'No noise limits given: the limit is 0 for all rows.',
    'The difference and the interval of jankyFrames are in percentage points (pp).',
  ].join(' ');
  if (result.statistics.length === 0) {
    return `${limits}\n\nNo rows.`;
  }
  const hasFallback = result.statistics.some((row) => row.comparisonFallback);
  const rows = result.statistics.map((row) => [
    row.scenario,
    row.metric,
    `${row.samplesA}/${row.samplesB}`,
    formatValue(row.medianA, METRIC_UNITS[row.metric]),
    formatValue(row.medianB, METRIC_UNITS[row.metric]),
    formatDifference(row),
    formatInterval(row),
    row.verdict,
  ]);
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
      rows
    ),
    ...(hasFallback
      ? [
          '',
          '(absolute) The relative difference is not defined for this row: the median of A, or the median of A in a bootstrap draw, is 0 or less. The difference and the interval are absolute values in the unit of the metric. When the median of A is above 0, the noise limit of the row is the relative limit times the median of A, in the unit of the metric. When the median of A is 0 or less, the row has no noise limit.',
        ]
      : []),
  ].join('\n');
}

export function failedSection(failed: FailedScenario[]): string {
  if (failed.length === 0) {
    return 'None.';
  }
  return failed
    .map((scenario) => {
      const causes = scenario.causes.map(
        (cause) =>
          `${cause.variant.toUpperCase()}: ${cause.cause}, ${cause.detail}`
      );
      return `- ${scenario.scenario} failed on ${failedVariants(scenario)}. Last ${causes.length} invalid blocks: ${causes.join('; ')}.`;
    })
    .join('\n');
}

export function deviceSection(serial: string, device: DeviceState): string {
  const entries: [string, unknown][] = [
    ['serial', serial],
    ...Object.entries(device),
  ];
  return table(
    ['Key', 'Value at session start'],
    entries.map(([key, value]) => [key, String(value)])
  );
}

export function segmentsSection(result: MeasurementResult<Judged>): string {
  const lines = [
    ...result.scenarios,
    ...(result.incompleteScenario ? [result.incompleteScenario] : []),
  ].flatMap(blockSegmentsLine);
  return [
    segmentsTable(result.segments),
    ...(lines.length > 0 ? ['', ...lines] : []),
  ].join('\n');
}

function segmentsTable(segments: Segment[]): string {
  return table(
    [
      'Segment',
      'Started',
      'Finished',
      'Status',
      'Battery level',
      'Battery temperature',
    ],
    segments.map((segment, i) => [
      String(i),
      segment.startedAt,
      segment.finishedAt ?? '-',
      segment.status,
      `${segment.device.batteryLevel}%`,
      `${segment.device.batteryTemperature} °C`,
    ])
  );
}

function blockSegmentsLine(outcome: ScenarioOutcome<Judged>): string[] {
  const blocksBySegment = new Map<number, number[]>();
  for (const sample of outcome.samples.filter((sample) => sample.accepted)) {
    blocksBySegment.set(sample.segment, [
      ...(blocksBySegment.get(sample.segment) ?? []),
      sample.block,
    ]);
  }
  if (blocksBySegment.size < 2) {
    return [];
  }
  const parts = [...blocksBySegment]
    .sort(([first], [second]) => first - second)
    .map(([segment, blocks]) => `${blockRange(blocks)} in segment ${segment}`);
  return [`- ${outcome.scenario}: ${parts.join(', ')}.`];
}

function blockRange(blocks: number[]): string {
  const first = Math.min(...blocks);
  const last = Math.max(...blocks);
  return first === last ? `block ${first}` : `blocks ${first}-${last}`;
}

export function invalidSection(
  samples: Recorded<Judged>[],
  causes: readonly InvalidCause[] = INVALID_CAUSES
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
