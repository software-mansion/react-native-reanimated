import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ANDROID_DEFINITION } from '../android-definition.mts';
import type { DeviceState } from '../android-device.mts';
import type { RunConfig, Variant } from '../config.mts';
import { evaluateExpectations } from '../expectations.mts';
import { IOS_DEFINITION } from '../ios-definition.mts';
import {
  expectationLine,
  renderReport,
  variantDifferences,
} from '../report.mts';
import type { RunResult, RunVariant } from '../results.mts';
import type { SampleRecord } from '../session.mts';
import type { VerdictRow } from '../verdict.mts';

const VARIANT: Variant = {
  reanimated: { kind: 'npm', version: '4.7.1' },
  worklets: { kind: 'npm', version: '0.13.1' },
  reanimatedFlags: {},
  workletsFlags: {},
  bundleMode: false,
  profiling: false,
};

const CONFIG: RunConfig = {
  name: 'android-sync-ui-props',
  a: VARIANT,
  b: {
    ...VARIANT,
    reanimatedFlags: { ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true },
  },
  scenarios: ['worklet-styles-transform', 'sticky-header'],
  expect: [
    {
      scenarios: ['worklet-styles-transform'],
      metrics: ['uiThreadCpu'],
      is: 'better',
    },
    {
      scenarios: ['worklet-styles-transform', 'sticky-header'],
      metrics: [...ANDROID_DEFINITION.verdictMetrics],
      is: 'notWorse',
    },
  ],
};

const DEVICE: DeviceState = {
  model: 'Pixel',
  hardwareSerial: 'HW1',
  fingerprint: 'google/pixel:17/X/1:user/release-keys',
  sdk: 37,
  abi: 'arm64-v8a',
  refreshRate: 120,
  brightness: 102,
  brightnessMode: 'manual',
  batteryLevel: 80,
  batteryStatus: 'charging',
  chargeState: 'usb',
  wifiEnabled: true,
  wifiConnected: true,
  thermalStatus: 0,
  batteryTemperature: 30,
};

function built(variant: 'a' | 'b', syncFlag: boolean): RunVariant {
  return {
    variant,
    buildKey: `key-${variant}`,
    directory: `/builds/key-${variant}`,
    artifact: `/builds/key-${variant}/app-release.apk`,
    installFile: `/builds/key-${variant}/app-release.apk`,
    installFileSha256: `sha-${variant}`,
    applicationId: `com.reanimatedbenchmark.${variant}`,
    installedVersions: { reanimated: '4.7.1', worklets: '0.13.1' },
    effectiveFlags: {
      reanimated: {
        ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: syncFlag,
        IOS_CSS_CORE_ANIMATION: false,
      },
      worklets: { RUNTIME_TEST_FLAG: false },
    },
  };
}

function row(overrides: Partial<VerdictRow>): VerdictRow {
  return {
    scenario: 'worklet-styles-transform',
    metric: 'uiThreadCpu',
    samplesA: 10,
    samplesB: 10,
    medianA: 100,
    medianB: 69,
    comparison: 'relative',
    comparisonFallback: false,
    difference: -0.31,
    interval: { low: -0.33, high: -0.29 },
    pValue: 0.0001,
    passesFalseDiscovery: true,
    noiseLimit: 0,
    verdict: 'better',
    ...overrides,
  };
}

const ROWS = [
  row({}),
  row({
    scenario: 'sticky-header',
    metric: 'frameDurationP95',
    medianA: 10,
    medianB: 10.6,
    difference: 0.06,
    interval: { low: 0.03, high: 0.09 },
    verdict: 'worse',
  }),
  row({
    scenario: 'sticky-header',
    metric: 'jankyFrames',
    medianA: 0,
    medianB: 0.02,
    comparison: 'absolute',
    difference: 0.02,
    interval: { low: 0, high: 0.04 },
    verdict: 'no change found',
  }),
  row({
    scenario: 'sticky-header',
    metric: 'coldStart',
    medianA: 0,
    medianB: 2,
    comparison: 'absolute',
    comparisonFallback: true,
    difference: 2,
    interval: { low: 0, high: 4 },
    noiseLimit: null,
    verdict: 'no change found',
  }),
];

function sample(overrides: Partial<SampleRecord>): SampleRecord {
  return {
    scenario: 'sticky-header',
    variant: 'a',
    block: 0,
    attempt: 0,
    position: 0,
    segment: 0,
    batteryLevel: 80,
    accepted: false,
    valid: false,
    cause: 'thermal',
    detail: 'thermal status 1 after the trace',
    timings: { wait: 12000, start: 900 },
    ...overrides,
  } as SampleRecord;
}

const RESULT: RunResult = {
  formatVersion: 1,
  measurementRevision: 1,
  platform: 'android',
  command: 'run',
  status: 'done',
  startedAt: '2026-11-12T10:00:00.000Z',
  finishedAt: '2026-11-12T11:00:00.000Z',
  config: CONFIG,
  options: { blocks: 5, noiseLimitsFile: null, keepTraces: false },
  noiseLimits: null,
  serial: 'SERIAL1',
  segments: [
    {
      startedAt: '2026-11-12T10:00:00.000Z',
      finishedAt: '2026-11-12T11:00:00.000Z',
      status: 'done',
      device: DEVICE,
    },
  ],
  appRefreshRate: 60,
  tools: {
    node: 'v24.16.0',
    adb: '1.0.41',
    traceProcessor: 'v59.1',
    devicePerfetto: 'v59.1',
  },
  variants: { a: built('a', false), b: built('b', true) },
  scenarios: [
    { scenario: 'worklet-styles-transform', samples: [], failed: null },
    {
      scenario: 'sticky-header',
      samples: [
        sample({}),
        sample({ cause: 'crash', timings: { wait: 14000 } }),
      ],
      failed: null,
    },
  ],
  incompleteScenario: null,
  abandonedScenarios: [],
  verdictRows: ROWS,
  advisoryRows: [],
  expectations: evaluateExpectations(CONFIG.expect, ROWS, []),
};

describe('expectationLine', () => {
  it('writes the lines of the spec example', () => {
    assert.equal(
      expectationLine(RESULT.expectations[0], 0, CONFIG, ANDROID_DEFINITION),
      '1. worklet-styles-transform, uiThreadCpu: better -> holds (-31%, interval -33% to -29%)'
    );
    assert.equal(
      expectationLine(RESULT.expectations[1], 1, CONFIG, ANDROID_DEFINITION),
      '2. all scenarios, all metrics: not worse -> fails (sticky-header, frameDurationP95: +6%, interval +3% to +9%)'
    );
  });

  it('names a failed scenario and a minimum improvement', () => {
    const [result] = evaluateExpectations(
      [
        {
          scenarios: ['sticky-header'],
          metrics: ['uiThreadCpu'],
          is: 'better',
          byAtLeast: 0.1,
        },
      ],
      [],
      [{ scenario: 'sticky-header', variants: ['a'], causes: [] }]
    );
    assert.equal(
      expectationLine(result, 0, CONFIG, ANDROID_DEFINITION),
      '1. sticky-header, uiThreadCpu: better by at least 10% -> not decided (sticky-header failed on A)'
    );
  });
});

describe('variantDifferences', () => {
  it('lists only the fields that differ', () => {
    assert.deepEqual(variantDifferences(CONFIG, RESULT.variants), [
      {
        field: 'reanimated ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS',
        a: 'false',
        b: 'true',
      },
    ]);
  });

  it('lists sources and build options', () => {
    const config = {
      ...CONFIG,
      b: {
        ...VARIANT,
        reanimated: { kind: 'tarball' as const, path: '/t/r.tgz' },
        profiling: true,
      },
    };
    assert.deepEqual(
      variantDifferences(config, {
        a: built('a', false),
        b: built('b', false),
      }).map((difference) => difference.field),
      ['reanimated source', 'profiling']
    );
  });
});

describe('renderReport', () => {
  const report = renderReport(RESULT);

  it('writes the sections in the order of the spec', () => {
    const headings = report
      .split('\n')
      .filter((line) => line.startsWith('## '));
    assert.deepEqual(headings, [
      '## Differences between A and B',
      '## Expectations',
      '## Verdicts',
      '## Metric definitions',
      '## Failed scenarios',
      '## Device',
      '## Segments',
      '## Invalid samples',
      '## Time for each sample (mean)',
    ]);
  });

  it('writes the verdict table, the noise limit note and the absolute rows', () => {
    assert.ok(
      report.includes(
        'This run is uncalibrated: it has no noise limits file, so the noise limit of each row is 0.'
      )
    );
    assert.ok(
      report.includes(
        '| worklet-styles-transform | uiThreadCpu | 10/10 | 100.00 ms/s | 69.00 ms/s | -31% | -33% to -29% | better |'
      )
    );
    assert.ok(
      report.includes(
        '| sticky-header | jankyFrames | 10/10 | 0.0% of frames | 2.0% of frames | +2.00 pp | 0.00 pp to +4.00 pp | no change found |'
      )
    );
    assert.ok(
      report.includes(
        '| sticky-header | coldStart | 10/10 | 0.00 ms | 2.00 ms | +2.00 ms (absolute, no noise limit) | 0.00 ms to +4.00 ms | no change found |'
      )
    );
    assert.ok(
      report.includes(
        'The difference and the interval of jankyFrames are in percentage points (pp).'
      )
    );
    assert.ok(
      report.includes(
        '(absolute) The relative difference is not defined for this row'
      )
    );
    assert.ok(
      report.includes(
        'When the median of A is above 0, the noise limit of the row is the relative limit times the median of A, in the unit of the metric. When the median of A is 0 or less, the row has no noise limit.'
      )
    );
  });

  it('shows an advisory row with its difference and interval and no verdict', () => {
    const coldStart = row({ metric: 'coldStart', medianA: 400, medianB: 440 });
    const {
      pValue: _p,
      passesFalseDiscovery: _f,
      noiseLimit: _n,
      verdict: _v,
      ...compared
    } = { ...coldStart, difference: 0.1, interval: { low: 0.05, high: 0.15 } };
    const ios = renderReport({
      ...RESULT,
      platform: 'ios',
      verdictRows: [ROWS[0]],
      advisoryRows: [
        { ...compared, hasData: true },
        {
          scenario: 'sticky-header',
          metric: 'coldStart',
          samplesA: 10,
          samplesB: 0,
          hasData: false,
        },
      ],
    });
    assert.ok(
      ios.includes(
        '| worklet-styles-transform | coldStart | 10/10 | 400.00 ms | 440.00 ms | +10% | +5% to +15% | no verdict |'
      )
    );
    assert.ok(
      ios.includes(
        '| sticky-header | coldStart | 10/0 | - | - | - | - | no verdict (no data) |'
      )
    );
    const rows = ios
      .split('\n')
      .filter((line) => line.startsWith('| worklet-styles-transform |'));
    assert.deepEqual(
      rows.map((line) => line.split(' | ')[1]),
      ['uiThreadCpu', 'coldStart']
    );
  });

  it('defines each metric of the verdict table for the platform of the run', () => {
    const ios = renderReport({ ...RESULT, platform: 'ios' });
    const section = ios.slice(
      ios.indexOf('## Metric definitions'),
      ios.indexOf('## Failed scenarios')
    );
    assert.ok(
      section.includes(
        'Numbers and verdicts are valid only within one platform, one phone and one measurement revision. This run has the measurement revision 1.'
      )
    );
    for (const metric of [
      ...IOS_DEFINITION.verdictMetrics,
      ...IOS_DEFINITION.advisoryMetrics,
    ]) {
      assert.ok(section.includes(`\`${metric}\``), metric);
    }
    assert.ok(section.includes('`hitches-updates`'));
    assert.ok(!section.includes('`hitchCount`'));
    assert.match(section, /\| `coldStart` \| ms \| .* \| no verdict, shown \|/);
  });

  it('marks only the fallback rows without a noise limit', () => {
    const fallback = row({
      metric: 'coldStart',
      medianA: 10,
      medianB: 30,
      comparison: 'absolute',
      comparisonFallback: true,
      difference: 20,
      interval: { low: 10, high: 30 },
      noiseLimit: 0.5,
      verdict: 'worse',
    });
    const withFallback = renderReport({ ...RESULT, verdictRows: [fallback] });
    assert.ok(withFallback.includes('| +20.00 ms (absolute) |'));
    assert.ok(!withFallback.includes('(absolute, no noise limit)'));
  });

  it('writes memory in kB and names the units of the noise limits', () => {
    const memory = row({
      scenario: 'worklet-styles-transform',
      metric: 'memory',
      medianA: 120000,
      medianB: 126000,
      difference: 0.05,
      interval: { low: 0.03, high: 0.07 },
      noiseLimit: 0.02,
      verdict: 'worse',
    });
    const withLimits = renderReport({
      ...RESULT,
      options: { ...RESULT.options, noiseLimitsFile: 'limits.json' },
      noiseLimits: {
        formatVersion: 1,
        platform: 'android',
        device: {
          model: 'Pixel',
          deviceId: 'HW1',
          osBuild: 'google/pixel:17/X/1:user/release-keys',
        },
        measurementRevision: 1,
        sources: [
          {
            folder: '/runs/aa',
            samples: { 'worklet-styles-transform': { a: 10, b: 10 } },
          },
        ],
        limits: { 'worklet-styles-transform': { memory: 0.02 } },
      },
      verdictRows: [memory],
    });
    assert.ok(
      withLimits.includes(
        '| worklet-styles-transform | memory | 10/10 | 120000 kB | 126000 kB | +5% | +3% to +7% | worse |'
      )
    );
    assert.ok(
      withLimits.includes(
        'Noise limits from limits.json: Pixel, device HW1, OS build google/pixel:17/X/1:user/release-keys, measurement revision 1, 1 A/A runs. A limit is a fraction for a relative metric and a value in the unit of the metric for an absolute metric (jankyFrames, a share of frames: 0.005 is 0.5 percentage points).'
      )
    );
  });

  it('stops instead of writing a number that is not finite', () => {
    assert.throws(
      () =>
        renderReport({
          ...RESULT,
          verdictRows: [row({ difference: Number.NaN })],
        }),
      /not a finite number/
    );
  });

  it('marks a run that is not complete and names the scenarios without data', () => {
    const stopped: RunResult = {
      ...RESULT,
      status: 'interrupted',
      scenarios: [RESULT.scenarios[0]],
      incompleteScenario: {
        ...RESULT.scenarios[1],
        samples: [sample({ cause: 'frames' })],
      },
      verdictRows: [ROWS[0]],
      expectations: evaluateExpectations(
        CONFIG.expect,
        [ROWS[0]],
        [],
        ['sticky-header']
      ),
    };
    const lines = renderReport(stopped).split('\n');
    assert.equal(
      lines[2],
      'This run is not complete (status: interrupted). Scenarios without data: sticky-header. The verdicts and the expectations are provisional.'
    );
    assert.ok(
      lines.includes(
        '2. all scenarios, all metrics: not worse -> not decided (-31%, interval -33% to -29%; sticky-header has no data)'
      )
    );
    assert.ok(
      lines.some((line) =>
        line.startsWith(
          'Provisional: the run is not complete. This run is uncalibrated'
        )
      )
    );
    assert.ok(lines.includes('| frames | 1 |'));
    assert.ok(!report.includes('not complete'));
  });

  it('names the scenarios with their own block count', () => {
    const report = renderReport({
      ...RESULT,
      config: { ...CONFIG, blocks: { 'sticky-header': 10 } },
    });
    assert.ok(
      report.includes('Blocks for each scenario: 5 (sticky-header: 10).')
    );
  });

  it('lists the segments of a resumed run', () => {
    const report = renderReport({
      ...RESULT,
      segments: [
        { ...RESULT.segments[0], status: 'tool error', error: 'offline' },
        {
          startedAt: '2026-11-12T12:00:00.000Z',
          status: 'running',
          device: { ...DEVICE, batteryLevel: 75, batteryTemperature: 31.5 },
        },
      ],
    });
    assert.ok(
      report.includes(
        '| 0 | 2026-11-12T10:00:00.000Z | 2026-11-12T11:00:00.000Z | tool error | 80% | 30 °C |'
      )
    );
    assert.ok(
      report.includes(
        '| 1 | 2026-11-12T12:00:00.000Z | - | running | 75% | 31.5 °C |'
      )
    );
  });

  it('names the segment of each block of a resumed scenario', () => {
    const accepted = (block: number, segment: number) =>
      [0, 1, 2, 3].map((position) =>
        sample({ block, position, segment, accepted: true, valid: true })
      );
    const resumed = renderReport({
      ...RESULT,
      scenarios: [
        {
          scenario: 'worklet-styles-transform',
          samples: [...accepted(0, 0), ...accepted(1, 0)],
          failed: null,
        },
        {
          scenario: 'sticky-header',
          samples: [
            ...accepted(0, 0),
            ...accepted(1, 0),
            sample({ block: 2, segment: 0 }),
            ...accepted(2, 1),
            ...accepted(3, 2),
          ],
          failed: null,
        },
      ],
    });
    assert.ok(
      resumed.includes(
        '- sticky-header: blocks 0-1 in segment 0, block 2 in segment 1, block 3 in segment 2.'
      )
    );
    assert.ok(!resumed.includes('- worklet-styles-transform:'));
    assert.ok(!report.includes(' in segment '));
  });

  it('names the work cause and the mount batch count of a failed scenario', () => {
    const detail = '38 mount batches, expected at least 300';
    const invalid = { variant: 'a' as const, cause: 'work' as const, detail };
    const failed = renderReport({
      ...RESULT,
      scenarios: [
        ...RESULT.scenarios,
        {
          scenario: 'shared-elements',
          samples: [
            sample({ scenario: 'shared-elements', cause: 'work', detail }),
          ],
          failed: {
            scenario: 'shared-elements',
            variants: ['a'],
            causes: [invalid, invalid, invalid],
          },
        },
      ],
    });
    assert.ok(
      failed.includes(
        `- shared-elements failed on A. Last 3 invalid blocks: A: work, ${detail}; A: work, ${detail}; A: work, ${detail}.`
      )
    );
    assert.ok(failed.includes('| work | 1 |'));
  });

  it('counts invalid samples by cause and gives the mean time of each step', () => {
    assert.ok(report.includes('| thermal | 1 |'));
    assert.ok(report.includes('| crash | 1 |'));
    assert.ok(report.includes('| frames | 0 |'));
    assert.ok(report.includes('| work | 0 |'));
    assert.ok(report.includes('| wait | 13.0 s |'));
    assert.ok(report.includes('| start | 0.9 s |'));
    assert.ok(report.includes('| pull | - |'));
  });
});
