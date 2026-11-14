import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { ANDROID_DEFINITION } from '../android-definition.mts';
import type { DeviceState } from '../android-device.mts';
import type { RunConfig, Variant } from '../config.mts';
import { IOS_DEFINITION } from '../ios-definition.mts';
import type { SampleMetrics } from '../metrics.mts';
import {
  checkNoiseLimitsRecord,
  validateNoiseLimitsRecord,
} from '../noise-limits-record.mts';
import {
  computeNoiseLimits,
  noiseLimitsCommand,
  splitNoise,
} from '../noise-limits.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import { writeResult } from '../results.mts';
import type { RunResult } from '../results.mts';
import type { Scenario } from '../scenarios.mts';
import type { Recorded, ScenarioOutcome } from '../session.mts';

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `noise-limits-${process.pid}`
);

after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const PHONE: DeviceState = {
  model: 'SM-A165F',
  deviceId: 'HW1',
  fingerprint: 'samsung/a16:16/X/1:user/release-keys',
  sdk: 36,
  abi: 'arm64-v8a',
  refreshRate: 60,
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
const IDENTITY = {
  model: 'SM-A165F',
  deviceId: 'HW1',
  osBuild: 'samsung/a16:16/X/1:user/release-keys',
};

const VARIANT: Variant = {
  reanimated: { kind: 'npm', version: '4.7.1' },
  worklets: { kind: 'npm', version: '0.13.1' },
  reanimatedFlags: {},
  workletsFlags: {},
  bundleMode: false,
  profiling: false,
};

function outcome(
  scenario: Scenario,
  metricsOf: (variant: 'a' | 'b', i: number) => Partial<SampleMetrics>
): ScenarioOutcome {
  const samples = (['a', 'b'] as const).flatMap((variant) =>
    Array.from(
      { length: 10 },
      (_, i) =>
        ({
          scenario,
          variant,
          round: Math.floor(i / 2),
          attempt: 0,
          position: 0,
          segment: 0,
          batteryLevel: 80,
          accepted: true,
          valid: true,
          timings: {},
          metrics: {
            frameDurationMedian: 10,
            frameDurationP95: 12,
            jankyFrames: 0.001,
            uiThreadCpu: 100,
            jsThreadCpu: 50,
            memory: 100000,
            windowMemoryDelta: 0,
            coldStart: 300,
            ...metricsOf(variant, i),
          },
        }) as Recorded
    )
  );
  return { scenario, samples, failed: null };
}

function writeRun(
  name: string,
  outcomes: ScenarioOutcome[],
  b: Variant = VARIANT,
  edit: (result: RunResult) => void = () => {}
): string {
  const folder = runFolder(name);
  const result = runResult(name, outcomes, b);
  edit(result);
  writeResult(folder, result);
  return folder;
}

function runFolder(name: string): string {
  const folder = path.join(ROOT, name);
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

function runResult(
  name: string,
  outcomes: ScenarioOutcome[],
  b: Variant = VARIANT
): RunResult {
  const config: RunConfig = {
    name,
    a: VARIANT,
    b,
    scenarios: outcomes.map((item) => item.scenario),
    expect: [],
  };
  return {
    formatVersion: 1,
    measurementRevision: 1,
    platform: 'android',
    command: 'run',
    status: 'tool error',
    startedAt: '2026-11-12T10:00:00.000Z',
    config,
    options: { blocks: 5, noiseLimitsFile: null, keepTraces: false },
    noiseLimits: null,
    segments: [
      {
        startedAt: '2026-11-12T10:00:00.000Z',
        status: 'tool error',
        device: PHONE,
      },
    ],
    appRefreshRate: 60,
    tools: {
      node: 'v24.16.0',
      adb: '1.0.41',
      traceProcessor: 'v59.1',
      devicePerfetto: 'v59.1',
    },
    variants: {},
    scenarios: outcomes,
    incompleteScenario: outcome('idle-cost', () => ({ uiThreadCpu: 900 })),
    abandonedScenarios: [],
    verdictRows: [],
    advisoryRows: [],
    expectations: [],
  };
}

function printed(runs: string[]): unknown {
  const lines: string[] = [];
  const log = console.log;
  console.log = (line: string) => void lines.push(line);
  try {
    assert.equal(noiseLimitsCommand({ command: 'noise-limits', runs }), 0);
  } finally {
    console.log = log;
  }
  return JSON.parse(lines.join('\n'));
}

describe('splitNoise', () => {
  it('takes the 97.5th percentile of the absolute difference over all splits', () => {
    assert.equal(splitNoise([1, 2], [3, 4], 'absolute'), 2);
    assert.ok(
      Math.abs((splitNoise([1, 2], [3, 4], 'relative') ?? 0) - 26 / 21) < 1e-12
    );
  });

  it('gives no limit when the relative difference is not defined', () => {
    assert.equal(splitNoise([0, 0, 1], [1, 1, 1], 'relative'), null);
    assert.equal(splitNoise([0, 0, 1], [1, 1, 1], 'absolute'), 1);
  });

  it('gives no limit with random splits when one split has no relative difference', () => {
    const zeros = new Array<number>(21).fill(0);
    const ones = new Array<number>(19).fill(1);
    const b = new Array<number>(40).fill(1);
    assert.equal(splitNoise([...zeros, ...ones], b, 'relative'), null);
  });

  it('gives the same limit each time with random splits', () => {
    const a = Array.from({ length: 20 }, (_, i) => 100 + i);
    const b = a.map((value) => value + 0.5);
    const limit = splitNoise(a, b, 'relative');
    assert.equal(splitNoise(a, b, 'relative'), limit);
    assert.ok(limit !== null && limit > 0 && limit < 0.1);
  });
});

describe('computeNoiseLimits', () => {
  it('applies the floors and gives no limit for windowMemoryDelta', () => {
    const limits = computeNoiseLimits(
      [
        outcome('css', () => ({})),
        outcome('mount-unmount', (_variant, i) => ({
          windowMemoryDelta: i * 3000,
        })),
      ],
      ANDROID_DEFINITION
    );
    const floors = {
      frameDurationMedian: 0.02,
      frameDurationP95: 0.02,
      jankyFrames: 0.005,
      uiThreadCpu: 0.02,
      jsThreadCpu: 0.02,
      memory: 0.02,
      coldStart: 0.02,
    };
    assert.deepEqual(limits.css, floors);
    assert.deepEqual(limits['mount-unmount'], floors);
  });

  it('leaves out a relative metric whose median can be 0', () => {
    const limits = computeNoiseLimits(
      [outcome('css', (_variant, i) => ({ coldStart: i < 6 ? 0 : 300 }))],
      ANDROID_DEFINITION
    );
    assert.equal(limits.css?.coldStart, undefined);
  });

  it('gives limits only for the verdict metrics of the platform', () => {
    const limits = computeNoiseLimits(
      [outcome('css', () => ({}))],
      IOS_DEFINITION
    );
    assert.deepEqual(Object.keys(limits.css ?? {}), [
      ...IOS_DEFINITION.verdictMetrics,
    ]);
  });
});

describe('noiseLimitsCommand', () => {
  it('prints a record of the platform, the revision and the limits of the complete scenarios of A/A runs', () => {
    const first = writeRun('aa-1', [outcome('css', () => ({}))]);
    const second = writeRun('aa-2', [outcome('sticky-header', () => ({}))]);
    const record = validateNoiseLimitsRecord(printed([first, second]));
    assert.equal(record.platform, 'android');
    assert.deepEqual(record.device, IDENTITY);
    assert.equal(record.measurementRevision, 1);
    assert.deepEqual(record.sources, [
      { folder: first, samples: { css: { a: 10, b: 10 } } },
      { folder: second, samples: { 'sticky-header': { a: 10, b: 10 } } },
    ]);
    assert.deepEqual(Object.keys(record.limits), ['css', 'sticky-header']);
  });

  it('refuses runs of different phones or OS builds', () => {
    const first = writeRun('phone-1', [outcome('css', () => ({}))]);
    const second = writeRun(
      'phone-2',
      [outcome('sticky-header', () => ({}))],
      VARIANT,
      (result) => {
        result.segments[0].device = { ...PHONE, model: 'Pixel 8' };
      }
    );
    assert.throws(
      () =>
        noiseLimitsCommand({ command: 'noise-limits', runs: [first, second] }),
      /The runs differ in model: SM-A165F in .*phone-1, Pixel 8 in .*phone-2/
    );
  });

  it('refuses runs of different measurement revisions', () => {
    const first = writeRun('rev-1', [outcome('css', () => ({}))]);
    const second = writeRun(
      'rev-0',
      [outcome('sticky-header', () => ({}))],
      VARIANT,
      (result) => {
        result.measurementRevision = 0;
      }
    );
    assert.throws(
      () =>
        noiseLimitsCommand({ command: 'noise-limits', runs: [first, second] }),
      /The runs differ in measurementRevision: 1 in .*rev-1, 0 in .*rev-0/
    );
  });

  it('refuses a run that is not A/A', () => {
    const folder = writeRun('ab', [outcome('css', () => ({}))], {
      ...VARIANT,
      profiling: true,
    });
    assert.throws(
      () => noiseLimitsCommand({ command: 'noise-limits', runs: [folder] }),
      /is not an A\/A run\. A and B differ in: profiling/
    );
  });

  it('refuses a scenario in two runs', () => {
    const first = writeRun('twice-1', [outcome('css', () => ({}))]);
    const second = writeRun('twice-2', [outcome('css', () => ({}))]);
    assert.throws(
      () =>
        noiseLimitsCommand({ command: 'noise-limits', runs: [first, second] }),
      /The scenario css is in two runs/
    );
  });
});

describe('validateNoiseLimitsRecord', () => {
  const RECORD = {
    formatVersion: 1,
    platform: 'android',
    device: IDENTITY,
    measurementRevision: 1,
    sources: [{ folder: '/runs/aa', samples: { css: { a: 10, b: 10 } } }],
    limits: { css: { uiThreadCpu: 0.05 } },
  };

  it('reads a valid record', () => {
    assert.deepEqual(validateNoiseLimitsRecord(RECORD), RECORD);
  });

  it('refuses an unknown format version', () => {
    for (const formatVersion of [undefined, 2]) {
      assert.throws(
        () => validateNoiseLimitsRecord({ ...RECORD, formatVersion }),
        /This driver reads only version 1\. Make the file again with the noise-limits command\./
      );
    }
  });

  it('refuses a record without its device or its sources', () => {
    const { device: _device, sources: _sources, ...rest } = RECORD;
    assert.throws(
      () => validateNoiseLimitsRecord({ ...rest, device: { model: 'X' } }),
      (error: Error) =>
        [
          'noise limits.device.deviceId must be a string',
          'noise limits.sources must be a list',
        ].every((part) => error.message.includes(part))
    );
  });

  it('refuses a metric that has no verdict on the platform, unknown names and negative limits', () => {
    assert.throws(
      () =>
        validateNoiseLimitsRecord({
          ...RECORD,
          platform: 'ios',
          limits: {
            nope: {},
            css: { coldStart: 0.1, windowMemoryDelta: 1, memory: -1 },
          },
        }),
      (error: Error) =>
        [
          'unknown scenario "nope"',
          '"coldStart" is not a verdict metric of the platform',
          '"windowMemoryDelta" is not a verdict metric of the platform',
          'css.memory must be a number of 0 or more',
        ].every((part) => error.message.includes(part))
    );
  });
});

describe('checkNoiseLimitsRecord', () => {
  const record = validateNoiseLimitsRecord({
    formatVersion: 1,
    platform: 'ios',
    device: IDENTITY,
    measurementRevision: 0,
    sources: [],
    limits: {},
  });

  it('refuses a record of another platform, device model or measurement revision', () => {
    assert.throws(
      () =>
        checkNoiseLimitsRecord(record, 'android', {
          ...IDENTITY,
          model: 'Pixel 8',
        }),
      /The noise limits do not fit this run: platform ios, the run is on android; device model SM-A165F, the run is on Pixel 8; measurement revision 0, the driver has revision 1\./
    );
  });

  it('accepts another phone of the same model and another OS build', () => {
    assert.doesNotThrow(() =>
      checkNoiseLimitsRecord({ ...record, measurementRevision: 1 }, 'ios', {
        model: IDENTITY.model,
        deviceId: 'HW2',
        osBuild: 'other',
      })
    );
  });
});
