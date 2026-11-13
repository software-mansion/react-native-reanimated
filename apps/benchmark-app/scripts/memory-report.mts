import { TAIL_LEVEL_START, TAIL_SLOPE_START } from './memory-series.mts';
import type {
  MemoryLaunch,
  MemoryResult,
  VariantMemorySummary,
} from './memory.mts';
import {
  deviceSection,
  differencesSection,
  failedSection,
  invalidSection,
  segmentsSection,
  table,
  timingSection,
} from './report.mts';
import { finiteNumber } from './results.mts';
import type { Recorded } from './session.mts';

export function renderMemoryReport(result: MemoryResult): string {
  const { options } = result;
  const launches = [
    ...result.scenarios,
    ...(result.incompleteScenario ? [result.incompleteScenario] : []),
    ...result.abandonedScenarios,
  ].flatMap((outcome) => outcome.samples);
  return [
    `# Memory test ${result.config.name}: ${options.scenario}`,
    '',
    ...(result.status === 'done'
      ? []
      : [
          `This test is not complete (status: ${result.status}). The verdicts are provisional.`,
          '',
        ]),
    `Started ${result.startedAt}. Finished ${result.finishedAt ?? '-'}. Launches for each variant: ${options.launches}. The driver reads \`dumpsys meminfo\` every ${options.intervalSeconds} s for ${options.durationSeconds} s after READY. After the last reading, it records one trace and checks the frames and the work of the app as \`run\` does.`,
    ...(result.config.note ? ['', result.config.note] : []),
    '',
    '## Differences between A and B',
    '',
    differencesSection(result),
    '',
    '## Verdicts',
    '',
    verdictsSection(result),
    '',
    '## Failed scenarios',
    '',
    failedSection(
      result.scenarios.flatMap((outcome) =>
        outcome.failed ? [outcome.failed] : []
      )
    ),
    '',
    '## Series',
    '',
    seriesSection(launches),
    '',
    '## Device',
    '',
    deviceSection(result.serial, result.segments[0].device),
    '',
    '## Segments',
    '',
    segmentsSection(result),
    '',
    '## Invalid launches',
    '',
    invalidSection(launches),
    '',
    '## Time for each launch (mean)',
    '',
    timingSection(launches),
    '',
  ].join('\n');
}

function verdictsSection(result: MemoryResult): string {
  const { options } = result;
  const rule = [
    `\`tailLevel\` is the median total PSS of the readings at or after ${percent(TAIL_LEVEL_START)} of the duration.`,
    `\`tailSlope\` is the least-squares slope of total PSS over the readings at or after ${percent(TAIL_SLOPE_START)} of the duration, in kB per minute.`,
    `A variant "rises" when the \`tailSlope\` of each of its launches is above the slope limit (${options.slopeLimit} kB per minute). Else it is "stable".`,
    `It is "not decided" when it has fewer than ${options.launches} accepted launches.`,
    'The test uses no other statistics.',
  ].join(' ');
  return [
    rule,
    '',
    table(
      [
        'Variant',
        'Launches',
        'tailLevel of each launch',
        'tailSlope of each launch',
        'Median tailLevel',
        'Median tailSlope',
        'Verdict',
      ],
      result.summary.map((summary) => verdictRow(summary, options.launches))
    ),
  ].join('\n');
}

function percent(fraction: number): string {
  return `${fraction * 100}%`;
}

function verdictRow(summary: VariantMemorySummary, launches: number): string[] {
  const levels = summary.launches.map((launch) => kB(launch.tailLevel));
  const slopes = summary.launches.map((launch) => slope(launch.tailSlope));
  return [
    summary.variant.toUpperCase(),
    `${summary.launches.length}/${launches}`,
    levels.join(', ') || '-',
    slopes.join(', ') || '-',
    summary.tailLevelMedian === null ? '-' : kB(summary.tailLevelMedian),
    summary.tailSlopeMedian === null ? '-' : slope(summary.tailSlopeMedian),
    summary.verdict,
  ];
}

function kB(value: number): string {
  return `${Math.round(finiteNumber(value, 'A value in the report'))} kB`;
}

function slope(value: number): string {
  return `${Math.round(finiteNumber(value, 'A slope in the report'))} kB/min`;
}

function seriesSection(launches: Recorded<MemoryLaunch>[]): string {
  if (launches.length === 0) {
    return 'No launches.';
  }
  return launches
    .map((launch, i) =>
      [
        `### Launch ${i + 1}: ${launchTitle(launch)}`,
        '',
        launch.readings.length === 0
          ? 'No readings.'
          : table(
              [
                'Seconds',
                'Total PSS',
                'Native heap',
                'Dalvik heap',
                'Graphics',
                'Private other',
                'Total swap PSS',
              ],
              launch.readings.map((reading) => [
                String(reading.seconds),
                kB(reading.totalPss),
                kB(reading.nativeHeap),
                kB(reading.dalvikHeap),
                kB(reading.graphics),
                kB(reading.privateOther),
                kB(reading.totalSwapPss),
              ])
            ),
      ].join('\n')
    )
    .join('\n\n');
}

function launchTitle(launch: Recorded<MemoryLaunch>): string {
  const place = `${launch.variant.toUpperCase()}, segment ${launch.segment}, block ${launch.block}, attempt ${launch.attempt}, position ${launch.position}`;
  const state = launch.valid
    ? 'valid'
    : `invalid (${launch.cause}: ${launch.detail})`;
  return `${place}, ${state}${launch.accepted ? ', accepted' : ''}`;
}
