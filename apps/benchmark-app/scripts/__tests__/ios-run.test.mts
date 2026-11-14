import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { before, describe, it } from 'node:test';

import type { Clock } from '../clock.mts';
import type { CommandContext } from '../command-context.mts';
import { ToolError } from '../errors.mts';
import type {
  IosDevice,
  IosDeviceState,
  IosLaunchArguments,
} from '../ios-device.mts';
import { iosPlatform } from '../ios-platform.mts';
import type { IosDependencies } from '../ios-platform.mts';
import { MEASUREMENT_REVISION } from '../measurement-rules.mts';
import type { MeasurementDependencies } from '../measurement.mts';
import type { DeviceTarget } from '../platform.mts';
import type { Processes } from '../processes.mts';
import { readResult } from '../results.mts';
import { resumeCommand, runCommand } from '../run.mts';
import { MINIMUM_WAIT_MS } from '../samples.mts';
import type { ValidationIdentity } from '../validation-sources.mts';
import { DEVICE, onlyRunFolder, useTestRoot } from './command-fake.mts';
import {
  END_BOUNDARY,
  IOS_SAMPLE_WINDOW,
  START_BOUNDARY,
  inAppSample,
  sampleLine,
} from './ios-fixtures.mts';
import { validationSources } from './validation-fixtures.mts';

const TEST_ROOT = useTestRoot('ios-run', {
  name: 'ios-test',
  a: { reanimated: '4.7.1', worklets: '0.13.1' },
  b: { reanimated: '4.7.1', worklets: '0.13.1' },
  scenarios: ['css'],
});
const IPHONE: DeviceTarget = { platform: 'ios', id: 'UDID1' };
const SIGN_COMMAND = path.join(TEST_ROOT.root, 'sign.sh');
const VALIDATION_FILE = path.join(TEST_ROOT.root, 'validation.json');
const RUN_IDENTITY: ValidationIdentity = {
  platform: 'ios',
  device: {
    model: 'iPhone 13 mini (iPhone14,4)',
    deviceId: 'UDID1',
    osBuild: '24A446',
  },
  measurementRevision: MEASUREMENT_REVISION,
  appBuild: 'sources',
};
const STATE: IosDeviceState = {
  deviceId: 'UDID1',
  name: 'Test iPhone',
  model: 'iPhone 13 mini',
  productType: 'iPhone14,4',
  osVersion: '27.0.1',
  osBuild: '24A446',
};

interface FakeOptions {
  state?: IosDeviceState;
  batteryLevelAtSample?: (sample: number) => number;
  interruptBeforeSample?: number;
}

function createFake(options: FakeOptions = {}) {
  let time = 0;
  let samples = 0;
  let interrupted = false;
  let interrupt: ((exitCode: number) => Promise<void>) | null = null;
  const installs: string[] = [];
  const signs: string[] = [];
  const launches: string[] = [];
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
      const coolsDownForSample = ms === MINIMUM_WAIT_MS ? samples + 1 : null;
      if (
        coolsDownForSample === options.interruptBeforeSample &&
        !interrupted
      ) {
        interrupted = true;
        await interrupt?.(130);
        throw new ToolError('the device connection ended');
      }
    },
  };
  const device = {
    readState: async () => options.state ?? STATE,
    checkInstalled: async () => {},
    install: async (ipa: string) => void installs.push(ipa),
    terminate: async () => {},
    launch: (
      applicationId: string,
      { scenario }: IosLaunchArguments,
      onLine: (line: string) => void
    ) => {
      launches.push(`${applicationId} ${scenario}`);
      onLine(`Launched application with ${applicationId} bundle identifier.`);
      onLine(
        'ReanimatedBenchmark: LAUNCH pid=812 mainThread=5001 refreshRate=60 thermal=0 coldStart=80.5 build=build'
      );
      if (scenario !== undefined) {
        samples++;
        const batteryLevel = options.batteryLevelAtSample?.(samples) ?? 100;
        onLine(
          `ReanimatedBenchmark: READY scenario=${scenario} version=1 load=80 jsThread=5002`
        );
        onLine(
          sampleLine(
            inAppSample({
              boundaries: [
                { ...START_BOUNDARY, batteryLevel },
                { ...END_BOUNDARY, batteryLevel },
              ],
            })
          )
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
      lockfileSha256: 'lock',
      appBuild: 'sources',
    }),
    createDevice: () => device as unknown as IosDevice,
    clock,
  };
  const dependencies: MeasurementDependencies = {
    platform: iosPlatform(ios),
  };
  const context: CommandContext = {
    processes: {
      run: async (command: string, args: string[]) => {
        if (command === SIGN_COMMAND) {
          signs.push(args.join(' '));
          fs.writeFileSync(args[1], `signed ${args[0]}`);
        }
        return { stdout: '1.0\n', stderr: '' };
      },
    } as unknown as Processes,
    log: () => {},
    onInterrupt: (action) => {
      interrupt = action;
    },
  };
  return { dependencies, context, installs, signs, launches };
}

function run(
  fake: ReturnType<typeof createFake>,
  device = IPHONE,
  validation?: string
) {
  return runCommand(
    {
      command: 'run',
      config: TEST_ROOT.configFile,
      device,
      outputDir: TEST_ROOT.outputDir,
      blocks: 1,
      keepTraces: false,
      signCommand: SIGN_COMMAND,
      validation,
    },
    fake.context,
    fake.dependencies
  );
}

function writeValidationRecord(
  change: Partial<ValidationIdentity> = {},
  jsThreadCpu: 'passed' | 'not validated' = 'passed'
): string {
  const directory = path.join(TEST_ROOT.root, 'validation-sources');
  fs.rmSync(directory, { recursive: true, force: true });
  const { writeObserverCost, record } = validationSources(directory, {
    ...RUN_IDENTITY,
    ...change,
  });
  const built = record(undefined, [
    writeObserverCost('idle', 'idle-cost'),
    writeObserverCost('loaded', 'css', (metric) =>
      metric === 'jsThreadCpu' ? jsThreadCpu : 'passed'
    ),
  ]);
  fs.writeFileSync(VALIDATION_FILE, JSON.stringify(built));
  return VALIDATION_FILE;
}

before(() => fs.writeFileSync(SIGN_COMMAND, '#!/bin/sh\n'));

describe('an iOS run', () => {
  it('builds, installs, launches each app one time and measures each sample', async () => {
    const fake = createFake();
    assert.equal(await run(fake), 1);
    const result = readResult(onlyRunFolder(TEST_ROOT));
    assert.equal(result.platform, 'ios');
    assert.equal(result.status, 'done');
    assert.deepEqual(result.segments[0].device, STATE);
    assert.equal(result.appRefreshRate, 60);
    assert.deepEqual(result.inAppState, {
      refreshRate: 60,
      batteryLevel: 100,
      batteryState: 'full',
      lowPowerMode: false,
      brightness: 50,
    });
    const folder = onlyRunFolder(TEST_ROOT);
    const signed = (variant: string) =>
      path.join(folder, 'signed', `${variant}.ipa`);
    assert.deepEqual(fake.signs, [
      `${TEST_ROOT.apkOf('a')} ${signed('a')}`,
      `${TEST_ROOT.apkOf('b')} ${signed('b')}`,
    ]);
    assert.deepEqual(fake.installs, [signed('a'), signed('b')]);
    assert.equal(result.variants.a?.installFile, signed('a'));
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
    assert.deepEqual(samples[0].traceWindow, IOS_SAMPLE_WINDOW);
    assert.equal(samples[0].batteryLevel, undefined);
    assert.deepEqual(result.verdictRows, []);
    assert.deepEqual(
      result.advisoryRows.map((row) => [
        row.metric,
        'unvalidated' in row && row.unvalidated === true,
      ]),
      [
        ['uiThreadCpu', true],
        ['jsThreadCpu', true],
        ['uiUpdateDurationMedian', false],
        ['uiUpdateDurationP95', false],
        ['missedDisplayLinkCallbacks', false],
        ['memory', false],
        ['coldStart', false],
      ]
    );
    assert.deepEqual(
      result.expectations.map((expectation) => expectation.status),
      ['not decided']
    );
    const report = fs.readFileSync(
      path.join(onlyRunFolder(TEST_ROOT), 'report.md'),
      'utf8'
    );
    assert.match(report, /\| osBuild \| 24A446 \|/);
    assert.match(
      report,
      /No validation record: no verdict for a metric \(the run has no validation record\)\./
    );
    assert.match(
      report,
      /\| css \| uiThreadCpu \| 2\/2 \| .* \| unvalidated \|/
    );
  });

  it('gives a verdict only for the metrics that a matching validation record validates', async () => {
    assert.equal(
      await run(
        createFake(),
        IPHONE,
        writeValidationRecord({}, 'not validated')
      ),
      1
    );
    const result = readResult(onlyRunFolder(TEST_ROOT));
    assert.deepEqual(
      result.verdictRows.map((row) => row.metric),
      ['uiThreadCpu']
    );
    assert.deepEqual(result.validity, {
      validated: ['uiThreadCpu'],
      reason: 'the validation record does not validate jsThreadCpu',
    });
    assert.ok(
      result.advisoryRows.some(
        (row) => row.metric === 'jsThreadCpu' && 'unvalidated' in row
      )
    );
    assert.ok(
      result.advisoryRows.some(
        (row) => row.metric === 'memory' && !('unvalidated' in row)
      )
    );
  });

  it('gives no verdict when the validation record is of another setup', async () => {
    for (const [change, reason] of [
      [
        { appBuild: 'other' },
        /the validation record does not fit the run: app build other -> sources/,
      ],
      [
        {
          device: {
            model: 'iPhone 14 (iPhone14,7)',
            deviceId: 'UDID1',
            osBuild: '24A446',
          },
        },
        /device model iPhone 14 \(iPhone14,7\) -> iPhone 13 mini \(iPhone14,4\)/,
      ],
      [
        { measurementRevision: MEASUREMENT_REVISION - 1 },
        /measurement revision/,
      ],
    ] as const) {
      fs.rmSync(TEST_ROOT.outputDir, { recursive: true, force: true });
      await run(createFake(), IPHONE, writeValidationRecord(change));
      const result = readResult(onlyRunFolder(TEST_ROOT));
      assert.deepEqual(result.verdictRows, []);
      assert.match(result.validity?.reason ?? '', reason);
    }
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
        createFake({
          batteryLevelAtSample: (sample) => (sample > 2 ? 99 : 100),
        })
      ),
      /The device state changed \(read by the app\): batteryLevel: 100 -> 99/
    );
  });

  it('stops when the sign command writes no file or does not exist', async () => {
    const fake = createFake();
    const silent = {
      ...fake.context,
      processes: {
        run: async () => ({ stdout: '1.0\n', stderr: '' }),
      } as unknown as Processes,
    };
    await assert.rejects(
      runCommand(
        {
          command: 'run',
          config: TEST_ROOT.configFile,
          device: IPHONE,
          outputDir: TEST_ROOT.outputDir,
          blocks: 1,
          keepTraces: false,
          signCommand: SIGN_COMMAND,
        },
        silent,
        fake.dependencies
      ),
      /The sign command .*sign\.sh wrote no file at .*signed\/a\.ipa/
    );
    await assert.rejects(
      runCommand(
        {
          command: 'run',
          config: TEST_ROOT.configFile,
          device: IPHONE,
          outputDir: TEST_ROOT.outputDir,
          blocks: 1,
          keepTraces: false,
          signCommand: path.join(TEST_ROOT.root, 'missing.sh'),
        },
        fake.context,
        fake.dependencies
      ),
      /The sign command .*missing\.sh does not exist\./
    );
  });

  it('refuses a device option of the other platform', async () => {
    await assert.rejects(
      run(createFake(), DEVICE),
      /This command measures on ios, but the device option is for android/
    );
  });

  it('refuses on resume a stored validation record whose embedded source is of another build, also with its SHA-256 made again', async () => {
    await assert.rejects(
      run(
        createFake({ interruptBeforeSample: 3 }),
        IPHONE,
        writeValidationRecord()
      ),
      /the device connection ended/
    );
    const folder = onlyRunFolder(TEST_ROOT);
    const file = path.join(folder, 'result.json');
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    const [source, ...rest] = stored.validation.sources.crosschecks;
    const result = { ...source.result, appBuild: 'WRONG BUILD' };
    stored.validation.sources.crosschecks = [
      {
        ...source,
        result,
        sha256: crypto
          .createHash('sha256')
          .update(JSON.stringify(result))
          .digest('hex'),
      },
      ...rest,
    ];
    fs.writeFileSync(file, JSON.stringify(stored));
    await assert.rejects(
      resumeCommand(
        { command: 'resume', folder, device: IPHONE },
        createFake().context,
        createFake().dependencies
      ),
      /result\.validation: the source .*steady is not of the setup of the record: app build sources -> WRONG BUILD/
    );
  });

  it('resumes with the stored state of the app and the stored validation record', async () => {
    await assert.rejects(
      run(
        createFake({ interruptBeforeSample: 3 }),
        IPHONE,
        writeValidationRecord()
      ),
      /the device connection ended/
    );
    fs.rmSync(VALIDATION_FILE);
    const folder = onlyRunFolder(TEST_ROOT);
    assert.equal(readResult(folder).incompleteScenario?.samples.length, 2);
    const resume = (fake: ReturnType<typeof createFake>, device = IPHONE) =>
      resumeCommand(
        { command: 'resume', folder, device },
        fake.context,
        fake.dependencies
      );
    const stored = fs.readFileSync(path.join(folder, 'result.json'), 'utf8');
    fs.writeFileSync(
      path.join(folder, 'result.json'),
      JSON.stringify({ ...JSON.parse(stored), inAppState: {} })
    );
    await assert.rejects(
      resume(createFake()),
      /result\.inAppState\.batteryLevel must be a finite number/
    );
    fs.writeFileSync(path.join(folder, 'result.json'), stored);
    await assert.rejects(
      resume(createFake({ state: { ...STATE, osBuild: '24B1' } })),
      /not the same as at the start of the measurement: osBuild: 24A446 -> 24B1/
    );
    await assert.rejects(
      resume(createFake({ batteryLevelAtSample: () => 90 })),
      /batteryLevel: 100 -> 90/
    );
    const renamed = createFake({ state: { ...STATE, name: 'New name' } });
    assert.equal(await resume(renamed), 0);
    assert.deepEqual(renamed.signs, []);
    const result = readResult(folder);
    assert.equal(result.status, 'done');
    assert.deepEqual(
      result.verdictRows.map((row) => row.metric),
      ['uiThreadCpu', 'jsThreadCpu']
    );
  });
});
