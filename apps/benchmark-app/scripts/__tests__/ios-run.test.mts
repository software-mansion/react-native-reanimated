import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { ToolError } from '../errors.mts';
import type { IosDevice, IosDeviceState } from '../ios-device.mts';
import { iosPlatform } from '../ios-platform.mts';
import type { IosDependencies } from '../ios-platform.mts';
import type { MeasurementDependencies } from '../measurement.mts';
import type { DeviceTarget } from '../platform.mts';
import type { Clock } from '../protocol.mts';
import { readResult } from '../results.mts';
import { resumeCommand, runCommand } from '../run.mts';
import type { CommandContext, Processes } from '../tools.mts';
import { DEVICE, onlyRunFolder, useTestRoot } from './command-fake.mts';
import { IOS_TRACE_METRICS, IOS_TRACE_WINDOW } from './ios-fixtures.mts';

const TEST_ROOT = useTestRoot('ios-run', {
  name: 'ios-test',
  a: { reanimated: '4.7.1', worklets: '0.13.1' },
  b: { reanimated: '4.7.1', worklets: '0.13.1' },
  scenarios: ['css'],
});
const IPHONE: DeviceTarget = { platform: 'ios', id: 'UDID1' };
const STATE: IosDeviceState = {
  hardwareSerial: 'UDID1',
  name: 'Test iPhone',
  model: 'iPhone 13 mini',
  productType: 'iPhone14,4',
  osVersion: '27.0.1',
  osBuild: '24A446',
};

interface FakeOptions {
  state?: IosDeviceState;
  batteryLevelAtTrace?: (trace: number) => number;
  interruptAtTrace?: number;
}

function createFake(options: FakeOptions = {}) {
  let time = 0;
  let traces = 0;
  let interrupt: (() => Promise<void>) | null = null;
  const installs: string[] = [];
  const launches: string[] = [];
  const tracedNames: string[] = [];
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
  };
  const device = {
    readState: async () => options.state ?? STATE,
    checkInstalled: async () => {},
    install: async (ipa: string) => void installs.push(ipa),
    terminate: async () => {},
    launch: (
      applicationId: string,
      scenario: string | undefined,
      _load: number | undefined,
      onLine: (line: string) => void
    ) => {
      launches.push(`${applicationId} ${scenario}`);
      onLine(`Launched application with ${applicationId} bundle identifier.`);
      onLine(
        'ReanimatedBenchmark: LAUNCH pid=812 mainThread=5001 refreshRate=60 thermal=0 coldStart=80.5'
      );
      if (scenario !== undefined) {
        onLine(
          `ReanimatedBenchmark: READY scenario=${scenario} version=1 load=80 jsThread=5002`
        );
      }
      return { stop: () => {}, failure: () => null };
    },
  };
  const ios: IosDependencies = {
    buildVariant: async ({ key }) => ({
      variant: key,
      buildKey: `key-${key}`,
      directory: path.join(TEST_ROOT.root, 'builds', key),
      artifact: TEST_ROOT.apkOf(key),
      applicationId: `com.reanimatedbenchmark.${key}`,
      installedVersions: { reanimated: '4.7.1', worklets: '0.13.1' },
      effectiveFlags: { reanimated: {}, worklets: {} },
    }),
    createDevice: () => device as unknown as IosDevice,
    createTracer: () => ({
      record: async (deviceName, _pid, traceFile) => {
        traces++;
        tracedNames.push(deviceName);
        if (traces === options.interruptAtTrace) {
          await interrupt?.();
          throw new ToolError('the device connection ended');
        }
        fs.mkdirSync(traceFile, { recursive: true });
      },
      collect: async () => {
        const state = {
          batteryLevel: options.batteryLevelAtTrace?.(traces) ?? 100,
          batteryState: 'full',
          lowPowerMode: false,
          brightness: 50,
        };
        return {
          processLived: true,
          metrics: IOS_TRACE_METRICS,
          window: IOS_TRACE_WINDOW,
          thermalState: 0,
          appStates: [state, state],
        };
      },
    }),
    clock,
  };
  const dependencies: MeasurementDependencies = {
    platform: iosPlatform(ios),
    runsDir: TEST_ROOT.runsDir,
  };
  const context: CommandContext = {
    processes: {
      run: async () => ({ stdout: '1.0\n', stderr: '' }),
    } as unknown as Processes,
    log: () => {},
    onInterrupt: (action) => {
      interrupt = action;
    },
  };
  return { dependencies, context, installs, launches, tracedNames };
}

function run(fake: ReturnType<typeof createFake>, device = IPHONE) {
  return runCommand(
    {
      command: 'run',
      config: TEST_ROOT.configFile,
      device,
      blocks: 1,
      keepTraces: false,
      signCommand: 'sign.sh',
    },
    fake.context,
    fake.dependencies
  );
}

describe('an iOS run', () => {
  it('builds, installs, launches each app one time and measures each sample', async () => {
    const fake = createFake();
    assert.equal(await run(fake), 0);
    const result = readResult(onlyRunFolder(TEST_ROOT));
    assert.equal(result.platform, 'ios');
    assert.equal(result.status, 'done');
    assert.equal(result.serial, 'UDID1');
    assert.deepEqual(result.segments[0].device, STATE);
    assert.equal(result.appRefreshRate, 60);
    assert.deepEqual(result.inAppState, {
      refreshRate: 60,
      batteryLevel: 100,
      batteryState: 'full',
      lowPowerMode: false,
      brightness: 50,
    });
    assert.deepEqual(fake.installs, [
      TEST_ROOT.apkOf('a'),
      TEST_ROOT.apkOf('b'),
    ]);
    assert.deepEqual(fake.launches.slice(0, 2), [
      'com.reanimatedbenchmark.a undefined',
      'com.reanimatedbenchmark.b undefined',
    ]);
    const samples = result.scenarios[0].samples;
    assert.deepEqual(
      samples.map((sample) => sample.variant),
      ['a', 'b', 'b', 'a']
    );
    assert.ok(samples.every((sample) => sample.valid && sample.accepted));
    assert.equal(samples[0].metrics?.coldStart, 80.5);
    assert.deepEqual(samples[0].traceWindow, IOS_TRACE_WINDOW);
    assert.equal(samples[0].batteryLevel, undefined);
    assert.equal(result.verdictRows.length, 6);
    assert.deepEqual(
      result.advisoryRows.map((row) => row.metric),
      ['coldStart']
    );
    const report = fs.readFileSync(
      path.join(onlyRunFolder(TEST_ROOT), 'report.md'),
      'utf8'
    );
    assert.match(report, /\| osBuild \| 24A446 \|/);
  });

  it('stops when the device is not the same before a sample', async () => {
    let reads = 0;
    const changing = createFake({
      get state() {
        reads++;
        return reads > 2 ? { ...STATE, osBuild: '24B1' } : STATE;
      },
    });
    await assert.rejects(
      run(changing),
      /The device state changed \(read before the cool-down\): osBuild: 24A446 -> 24B1/
    );
  });

  it('stops when the battery level in the app changes', async () => {
    await assert.rejects(
      run(
        createFake({ batteryLevelAtTrace: (trace) => (trace > 2 ? 99 : 100) })
      ),
      /The device state changed \(read in the trace\): batteryLevel: 100 -> 99/
    );
  });

  it('refuses a device option of the other platform', async () => {
    await assert.rejects(
      run(createFake(), DEVICE),
      /This command measures on ios, but the device option is for android/
    );
  });

  it('resumes with the stored state of the app as the reference', async () => {
    await assert.rejects(
      run(createFake({ interruptAtTrace: 3 })),
      /the device connection ended/
    );
    const folder = onlyRunFolder(TEST_ROOT);
    assert.equal(readResult(folder).incompleteScenario?.samples.length, 2);
    const resume = (fake: ReturnType<typeof createFake>, device = IPHONE) =>
      resumeCommand(
        { command: 'resume', folder, device },
        fake.context,
        fake.dependencies
      );
    await assert.rejects(
      resume(createFake({ state: { ...STATE, osBuild: '24B1' } })),
      /not the same as at the start of the run: osBuild: 24A446 -> 24B1/
    );
    await assert.rejects(
      resume(createFake({ batteryLevelAtTrace: () => 90 })),
      /batteryLevel: 100 -> 90/
    );
    const renamed = createFake({ state: { ...STATE, name: 'New name' } });
    assert.equal(await resume(renamed), 0);
    assert.equal(readResult(folder).status, 'done');
    assert.deepEqual([...new Set(renamed.tracedNames)], ['New name']);
  });
});
