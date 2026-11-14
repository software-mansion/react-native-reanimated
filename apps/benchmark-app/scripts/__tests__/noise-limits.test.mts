import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import type { DeviceState } from '../android-device.mts';
import type { RunConfig, Variant } from '../config.mts';
import { IOS_DEFINITION } from '../ios-definition.mts';
import { MEASUREMENT_REVISION } from '../measurement-rules.mts';
import type { SampleMetrics } from '../metrics.mts';
import {
  checkNoiseLimitsRecord,
  checkScenarioIdentity,
  validateNoiseLimitsRecord,
} from '../noise-limits-record.mts';
import { noiseLimitsCommand } from '../noise-limits.mts';
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
const IPHONE = {
  deviceId: 'UDID1',
  name: 'Test iPhone',
  model: 'iPhone 13 mini',
  productType: 'iPhone14,4',
  osVersion: '27.0.1',
  osBuild: '24A446',
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
          report: { version: 1, load: 10, jsThread: 5 },
          metrics: {
            frameDurationMedian: 10,
            frameDurationP95: 12,
            jankyFrames: 0.001,
            uiThreadCpu: 100,
            jsThreadCpu: 50,
            memory: 100000,
            windowMemoryDelta: 0,
            coldStart: 300,
            frameCyclesMedian: null,
            frameCyclesP95: null,
            uiUpdateDurationMedian: 5,
            uiUpdateDurationP95: 7,
            missedDisplayLinkCallbacks: 0,
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
    measurementRevision: MEASUREMENT_REVISION,
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

describe('noise limits of each metric', () => {
  const limitsOf = (name: string, outcomes: ScenarioOutcome[]) =>
    validateNoiseLimitsRecord(printed([writeRun(name, outcomes)])).limits;

  it('applies the floors and gives no limit for windowMemoryDelta', () => {
    const limits = limitsOf('floors', [
      outcome('css', () => ({})),
      outcome('mount-unmount', (_variant, i) => ({
        windowMemoryDelta: i * 3000,
      })),
    ]);
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
    const limits = limitsOf('zero', [
      outcome('css', (_variant, i) => ({ coldStart: i < 6 ? 0 : 300 })),
    ]);
    assert.equal(limits.css?.coldStart, undefined);
  });

  it('gives limits only for the verdict metrics of the platform', () => {
    const folder = writeRun(
      'ios',
      [outcome('css', () => ({}))],
      VARIANT,
      (result) => {
        result.platform = 'ios';
        result.segments[0].device = IPHONE;
      }
    );
    const { limits } = validateNoiseLimitsRecord(printed([folder]));
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
    assert.equal(record.measurementRevision, MEASUREMENT_REVISION);
    assert.deepEqual(record.sources, [
      { folder: first, samples: { css: { a: 10, b: 10 } } },
      { folder: second, samples: { 'sticky-header': { a: 10, b: 10 } } },
    ]);
    assert.deepEqual(Object.keys(record.limits), ['css', 'sticky-header']);
    assert.deepEqual(record.scenarios, {
      css: { version: 1, load: 10 },
      'sticky-header': { version: 1, load: 10 },
    });
  });

  it('refuses a scenario whose accepted samples have two loads', () => {
    const folder = writeRun(
      'loads',
      [outcome('css', () => ({}))],
      VARIANT,
      (result) => {
        Object.assign(result.scenarios[0].samples[3], {
          report: { version: 1, load: 20, jsThread: 5 },
        });
      }
    );
    assert.throws(
      () => noiseLimitsCommand({ command: 'noise-limits', runs: [folder] }),
      /The accepted samples of css in .*loads do not have one scenario version and load: version 1 with the load 10; version 1 with the load 20/
    );
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
      new RegExp(
        `The runs differ in measurementRevision: ${MEASUREMENT_REVISION} in .*rev-1, 0 in .*rev-0`
      )
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

  it('refuses a run with empty metrics in a sample', () => {
    const folder = writeRun(
      'empty',
      [outcome('css', () => ({}))],
      VARIANT,
      (result) => {
        Object.assign(result.scenarios[0].samples[0], { metrics: {} });
      }
    );
    assert.throws(
      () => noiseLimitsCommand({ command: 'noise-limits', runs: [folder] }),
      /result\.scenarios\[0\]\.samples\[0\]\.metrics\.uiThreadCpu must be a finite number/
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
    measurementRevision: MEASUREMENT_REVISION,
    sources: [{ folder: '/runs/aa', samples: { css: { a: 10, b: 10 } } }],
    scenarios: { css: { version: 1, load: 10 } },
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

  it('refuses limits of a scenario without its version and load', () => {
    assert.throws(
      () =>
        validateNoiseLimitsRecord({
          ...RECORD,
          scenarios: { css: { version: 1 } },
          limits: { ...RECORD.limits, 'idle-cost': {} },
        }),
      (error: Error) =>
        [
          'noise limits.scenarios.css.load must be an integer',
          'noise limits.limits.idle-cost has no scenario version and load',
        ].every((part) => error.message.includes(part))
    );
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
            css: { coldStart: 0.1, memory: 1, jsThreadCpu: -1 },
          },
        }),
      (error: Error) =>
        [
          'unknown scenario "nope"',
          '"coldStart" is not a verdict metric of the platform',
          '"memory" is not a verdict metric of the platform',
          'css.jsThreadCpu must be a number of 0 or more',
        ].every((part) => error.message.includes(part))
    );
  });
});

describe('checkScenarioIdentity', () => {
  const record = validateNoiseLimitsRecord({
    formatVersion: 1,
    platform: 'android',
    device: IDENTITY,
    measurementRevision: MEASUREMENT_REVISION,
    sources: [],
    scenarios: { css: { version: 2, load: 40 } },
    limits: { css: {} },
  });

  it('refuses a sample of another scenario version or load', () => {
    for (const measured of [
      { version: 3, load: 40 },
      { version: 2, load: 41 },
    ]) {
      assert.throws(
        () => checkScenarioIdentity(record, 'css', measured),
        new RegExp(
          `The noise limits of css are of the scenario version 2 with the load 40, but the app reports the version ${measured.version} with the load ${measured.load}\\.`
        )
      );
    }
  });

  it('accepts the same version and load, and a scenario without a record entry', () => {
    assert.doesNotThrow(() =>
      checkScenarioIdentity(record, 'css', { version: 2, load: 40 })
    );
    assert.doesNotThrow(() =>
      checkScenarioIdentity(record, 'idle-cost', { version: 9, load: 1 })
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
    scenarios: {},
    limits: {},
  });

  it('refuses a record of another platform, device model or measurement revision', () => {
    assert.throws(
      () =>
        checkNoiseLimitsRecord(record, 'android', {
          ...IDENTITY,
          model: 'Pixel 8',
        }),
      new RegExp(
        `The noise limits do not fit this run: platform ios, the run is on android; device model SM-A165F, the run is on Pixel 8; measurement revision 0, the driver has revision ${MEASUREMENT_REVISION}\\.`
      )
    );
  });

  it('accepts another phone of the same model and another OS build', () => {
    assert.doesNotThrow(() =>
      checkNoiseLimitsRecord(
        { ...record, measurementRevision: MEASUREMENT_REVISION },
        'ios',
        { model: IDENTITY.model, deviceId: 'HW2', osBuild: 'other' }
      )
    );
  });
});
