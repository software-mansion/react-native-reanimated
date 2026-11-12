import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RunConfig, Variant } from '../config.mts';
import { evaluateExpectations } from '../expectations.mts';
import { VERDICT_METRICS } from '../metrics.mts';
import {
  expectationLine,
  renderReport,
  variantDifferences,
} from '../report.mts';
import type { RunResult } from '../results.mts';
import type { SampleRecord } from '../session.mts';
import type { BuiltVariant } from '../variant-build.mts';
import type { VerdictRow } from '../verdict.mts';

const VARIANT: Variant = {
  reanimated: { kind: 'npm', version: '4.7.1' },
  worklets: { kind: 'npm', version: '0.8.3' },
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
      metrics: [...VERDICT_METRICS],
      is: 'notWorse',
    },
  ],
};

function built(variant: 'a' | 'b', syncFlag: boolean): BuiltVariant {
  return {
    variant,
    buildKey: `key-${variant}`,
    directory: `/builds/key-${variant}`,
    apk: `/builds/key-${variant}/app-release.apk`,
    applicationId: `com.reanimatedbenchmark.${variant}`,
    installedVersions: { reanimated: '4.7.1', worklets: '0.8.3' },
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
    comparisonFallback: true,
    difference: 0.02,
    interval: { low: 0, high: 0.04 },
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
  status: 'done',
  startedAt: '2026-11-12T10:00:00.000Z',
  finishedAt: '2026-11-12T11:00:00.000Z',
  config: CONFIG,
  options: { blocks: 5, noiseLimitsFile: null, keepTraces: false },
  noiseLimits: null,
  serial: 'SERIAL1',
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
  statistics: ROWS,
  expectations: evaluateExpectations(CONFIG.expect, ROWS, []),
};

describe('expectationLine', () => {
  it('writes the lines of the spec example', () => {
    assert.equal(
      expectationLine(RESULT.expectations[0], 0, CONFIG),
      '1. worklet-styles-transform, uiThreadCpu: better -> holds (-31%, interval -33% to -29%)'
    );
    assert.equal(
      expectationLine(RESULT.expectations[1], 1, CONFIG),
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
      expectationLine(result, 0, CONFIG),
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
      '## Failed scenarios',
      '## Device',
      '## Invalid samples',
      '## Time for each sample (mean)',
    ]);
  });

  it('writes the verdict table, the noise limit note and the absolute rows', () => {
    assert.ok(
      report.includes('No noise limits given: the limit is 0 for all rows.')
    );
    assert.ok(
      report.includes(
        '| worklet-styles-transform | uiThreadCpu | 100.00 ms/s | 69.00 ms/s | -31% | -33% to -29% | better |'
      )
    );
    assert.ok(
      report.includes(
        '| sticky-header | jankyFrames | 0.0% of frames | 2.0% of frames | +2.0% of frames (absolute, no noise limit) | 0.0% of frames to +4.0% of frames | no change found |'
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

  it('marks only the fallback rows without a noise limit', () => {
    const fallback = row({
      metric: 'jankyFrames',
      medianA: 0.01,
      medianB: 0.03,
      comparison: 'absolute',
      comparisonFallback: true,
      difference: 0.02,
      interval: { low: 0.01, high: 0.03 },
      noiseLimit: 0.005,
      verdict: 'worse',
    });
    const withFallback = renderReport({ ...RESULT, statistics: [fallback] });
    assert.ok(withFallback.includes('| +2.0% of frames (absolute) |'));
    assert.ok(!withFallback.includes('(absolute, no noise limit)'));
  });

  it('writes memoryGrowth in kB without the fallback mark and names the units of the noise limits', () => {
    const growth = row({
      scenario: 'worklet-styles-transform',
      metric: 'memoryGrowth',
      medianA: -120,
      medianB: 380,
      comparison: 'absolute',
      difference: 500,
      interval: { low: 300, high: 700 },
      noiseLimit: 100,
      verdict: 'worse',
    });
    const withLimits = renderReport({
      ...RESULT,
      options: { ...RESULT.options, noiseLimitsFile: 'limits.json' },
      noiseLimits: { 'worklet-styles-transform': { memoryGrowth: 100 } },
      statistics: [growth],
    });
    assert.ok(
      withLimits.includes(
        '| worklet-styles-transform | memoryGrowth | -120 kB | 380 kB | +500 kB | +300 kB to +700 kB | worse |'
      )
    );
    assert.ok(
      withLimits.includes(
        'a value in the unit of the metric for an absolute metric (memoryGrowth, in kB)'
      )
    );
    assert.ok(!withLimits.includes('(absolute)'));
  });

  it('stops instead of writing a number that is not finite', () => {
    assert.throws(
      () =>
        renderReport({
          ...RESULT,
          statistics: [row({ difference: Number.NaN })],
        }),
      /not a finite number/
    );
  });

  it('counts invalid samples by cause and gives the mean time of each step', () => {
    assert.ok(report.includes('| thermal | 1 |'));
    assert.ok(report.includes('| crash | 1 |'));
    assert.ok(report.includes('| frames | 0 |'));
    assert.ok(report.includes('| wait | 13.0 s |'));
    assert.ok(report.includes('| start | 0.9 s |'));
    assert.ok(report.includes('| pull | - |'));
  });
});
