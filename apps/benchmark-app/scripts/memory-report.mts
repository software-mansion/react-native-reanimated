import {
  LATE_LIMIT_SHARE,
  DRAWING_FLOOR_SHARE,
  MINIMUM_JUDGED_DURATION_SECONDS,
  TAIL_LEVEL_START,
  TAIL_SLOPE_START,
} from './memory-series.mts';
import type {
  MemoryLaunch,
  MemoryResult,
  VariantMemorySummary,
} from './memory.mts';
import {
  counted,
  deviceSection,
  differencesSection,
  failedSection,
  invalidSection,
  segmentsSection,
  table,
  timingSection,
} from './report.mts';
import { finiteNumber } from './results.mts';
import { SAMPLE_INVALID_CAUSES } from './samples.mts';
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
      ),
      'launches'
    ),
    '',
    '## Series',
    '',
    seriesSection(launches),
    '',
    '## Device',
    '',
    deviceSection(result.segments[0].device),
    '',
    '## Segments',
    '',
    segmentsSection(result, 'launch'),
    '',
    '## Invalid launches',
    '',
    invalidSection(launches, [
      ...SAMPLE_INVALID_CAUSES,
      'late',
      'reset',
      'drawing',
    ]),
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
    `A variant "rises" when the \`tailSlope\` of each of its launches is above the slope limit (${options.slopeLimit} kB per minute).`,
    'It is "no rise found" when the `tailSlope` of each launch is at or below the limit, and "mixed" when the launches do not agree.',
    `It is "not decided" when it has fewer than ${options.launches} accepted launches.`,
    `A verdict needs a duration of at least ${MINIMUM_JUDGED_DURATION_SECONDS} s. Else the verdict is "not judged".`,
  ].join(' ');
  const checks = [
    `A reading that comes more than ${LATE_LIMIT_SHARE * options.intervalSeconds} s after its planned time makes the launch invalid (\`late\`).`,
    `Drawing check: between two frame counts ("Total frames rendered" of \`dumpsys gfxinfo\`), the app must draw at least ${percent(DRAWING_FLOOR_SHARE)} of the display refresh rate in frames per second. Else the launch is invalid (\`drawing\`).`,
    'A new "Stats since" value or a lower count means that the counter was reset, and the launch is invalid (`reset`).',
    'The frame count proves that the app drew during each interval. It does not prove that the scenario made progress during each interval.',
    'The trace after the last reading proves the work of the scenario for the last 10 s only.',
  ].join(' ');
  return [
    rule,
    '',
    'Limits of the test:',
    '',
    `- It uses ${counted(options.launches, 'launch', 'launches')} for each variant and gives no confidence interval.`,
    '- "no rise found" does not prove that there is no leak.',
    '- The test does not find a rise that is slower than the slope limit.',
    '- A late drop of memory can hide a rise.',
    '- The second half of the duration can still contain start-up effects.',
    '- The verdict uses total PSS only. A rise in another value, for example in swap PSS, does not change it.',
    '- The same number of launches for each variant does not give the same conditions. A repeated launch or a resumed test changes the order, and the launches of one variant can start on a cooler device. The Series section gives the segment, the launch number and the attempt of each launch.',
    '',
    checks,
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

function slope(value: number): string {
  return `${Math.round(finiteNumber(value, 'A slope in the report'))} kB/min`;
}

function kB(value: number): string {
  return `${Math.round(finiteNumber(value, 'A value in the report'))} kB`;
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
                'Planned s',
                'Measured s',
                'meminfo ms',
                'Frames s',
                'Frames',
                'Battery',
                'Battery °C',
                'Total PSS',
                'Native heap',
                'Dalvik heap',
                'Graphics',
                'Private other',
                'Total swap PSS',
              ],
              launch.readings.map((reading) => [
                String(reading.plannedSeconds),
                reading.seconds.toFixed(1),
                String(Math.round(reading.meminfoMs)),
                reading.frameSeconds.toFixed(1),
                String(reading.frameCount),
                `${reading.batteryLevel}%`,
                String(reading.batteryTemperature),
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
  const place = `${launch.variant.toUpperCase()}, segment ${launch.segment}, launch ${launch.round}, attempt ${launch.attempt}`;
  const state = launch.valid
    ? 'valid'
    : `invalid (${launch.cause}: ${launch.detail})`;
  return `${place}, ${state}${launch.accepted ? ', accepted' : ''}`;
}
