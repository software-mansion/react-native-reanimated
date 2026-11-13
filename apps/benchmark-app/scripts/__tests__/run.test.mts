import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';

import type { AndroidDevice, DeviceState } from '../android-device.mts';
import { ToolError } from '../errors.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { TraceMetrics } from '../perfetto.mts';
import type { Clock } from '../protocol.mts';
import { readResult, writeResult } from '../results.mts';
import type { RunResult, RunVariant } from '../results.mts';
import { resumeCommand, runCommand } from '../run.mts';
import type { RunDependencies } from '../run.mts';
import type { SampleRecord } from '../session.mts';
import type { CommandContext, Processes } from '../tools.mts';
import type { BuiltVariant } from '../variant-build.mts';

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `run-${process.pid}`
);
const RUNS_DIR = path.join(ROOT, 'runs');
const SERIAL = 'SERIAL1';

const STATE: DeviceState = {
  model: 'Pixel',
  hardwareSerial: 'HW1',
  fingerprint: 'google/pixel:17/X/1:user/release-keys',
  sdk: 37,
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

const METRICS: TraceMetrics = {
  frameDurationMedian: 8,
  frameDurationP90: 10,
  frameDurationP95: 11,
  frameDurationP99: 14,
  jankyFrames: 0.01,
  frameTimelineDurationMedian: 16,
  frameTimelineDurationP95: 33,
  frameTimelineFrameCount: 600,
  jankFlaggedFrames: 0.02,
  appDeadlineMissedFrames: 0.01,
  drawFrameMedian: 6,
  drawFrameP95: 9,
  uiThreadCpu: 120,
  jsThreadCpu: 80,
  renderThreadCpu: 60,
  processCpu: 400,
  mountBatchCount: 590,
  memory: 150000,
  memoryGrowth: 100,
  frameCount: 600,
  expectedFrameCount: 600,
};

interface FakeOptions {
  interruptAtTrace?: number;
  state?: DeviceState;
  toolVersion?: string;
}

let previousAndroidHome: string | undefined;

before(() => {
  previousAndroidHome = process.env.ANDROID_HOME;
  fs.mkdirSync(path.join(ROOT, 'sdk', 'platform-tools'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'sdk', 'platform-tools', 'adb'), '');
  fs.writeFileSync(path.join(ROOT, 'trace_processor_shell'), '');
  process.env.ANDROID_HOME = path.join(ROOT, 'sdk');
});

after(() => {
  process.env.ANDROID_HOME = previousAndroidHome;
  fs.rmSync(ROOT, { recursive: true, force: true });
});

beforeEach(() => {
  fs.rmSync(RUNS_DIR, { recursive: true, force: true });
  for (const variant of ['a', 'b']) {
    fs.mkdirSync(path.join(ROOT, 'builds', variant), { recursive: true });
    fs.writeFileSync(apkOf(variant), `apk ${variant}`);
  }
  fs.writeFileSync(
    path.join(ROOT, 'config.json'),
    JSON.stringify({
      name: 'resume-test',
      a: { reanimated: '4.7.1', worklets: '0.13.1' },
      b: { reanimated: '4.7.1', worklets: '0.13.1' },
      scenarios: ['css', 'idle-cost'],
      blocks: { 'idle-cost': 2 },
    })
  );
});

function apkOf(variant: string): string {
  return path.join(ROOT, 'builds', variant, 'app-release.apk');
}

function createFake(options: FakeOptions = {}) {
  let time = 0;
  let traces = 0;
  let scenario = '';
  let interrupt: (() => Promise<void>) | null = null;
  const installs: string[] = [];
  const logs: string[] = [];
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
  };
  const device = {
    checkConnected: async () => {},
    readState: async () => options.state ?? STATE,
    install: async (apk: string) => void installs.push(apk),
    compileForSpeed: async () => {},
    forceStop: async () => {},
    stopTraces: async () => {},
    removeAllTraces: async () => {},
    readThermalStatus: async () => 0,
    readBatteryTemperature: async () => 30,
    clearLog: async () => {},
    startActivity: async (_id: string, name: string) => {
      scenario = name;
      return { started: true, totalTime: 300 };
    },
    streamReports: (onLine: (line: string) => void) => {
      onLine(`READY scenario=${scenario} version=1 load=1`);
      return { stop: () => {}, failure: () => null };
    },
    readPid: async () => 100,
    push: async () => {},
    recordTrace: async () => {
      traces++;
      if (traces === options.interruptAtTrace) {
        await interrupt?.();
        throw new ToolError('the device connection ended');
      }
    },
    pull: async (_remote: string, local: string) =>
      fs.writeFileSync(local, 'trace'),
    remove: async () => {},
  };
  const dependencies: RunDependencies = {
    buildVariant: async ({ key }) =>
      ({
        variant: key,
        buildKey: `key-${key}`,
        directory: path.join(ROOT, 'builds', key),
        apk: apkOf(key),
        applicationId: `com.reanimatedbenchmark.${key}`,
        installedVersions: { reanimated: '4.7.1', worklets: '0.13.1' },
        effectiveFlags: { reanimated: {}, worklets: {} },
      }) satisfies BuiltVariant,
    createDevice: () => device as unknown as AndroidDevice,
    createCollector: () => ({
      collect: async () => ({ processLived: true, metrics: METRICS }),
    }),
    clock,
    runsDir: RUNS_DIR,
  };
  const processes = {
    run: async () => ({
      stdout: `${options.toolVersion ?? '1.0'}\n`,
      stderr: '',
    }),
  } as unknown as Processes;
  const context: CommandContext = {
    processes,
    log: (message) => void logs.push(message),
    onInterrupt: (action) => {
      interrupt = action;
    },
  };
  return { dependencies, context, installs };
}

async function stoppedRun({
  interruptAtTrace = 6,
  keepTraces = false,
} = {}): Promise<string> {
  const { dependencies, context } = createFake({ interruptAtTrace });
  await assert.rejects(
    runCommand(
      {
        command: 'run',
        config: path.join(ROOT, 'config.json'),
        serial: SERIAL,
        blocks: 1,
        keepTraces,
        traceProcessor: path.join(ROOT, 'trace_processor_shell'),
      },
      context,
      dependencies
    ),
    /the device connection ended/
  );
  const [folder] = fs.readdirSync(RUNS_DIR);
  return path.join(RUNS_DIR, folder);
}

function resume(folder: string, options: FakeOptions = {}, serial = SERIAL) {
  const { dependencies, context, installs } = createFake(options);
  return {
    installs,
    run: resumeCommand(
      {
        command: 'resume',
        folder,
        serial,
        traceProcessor: path.join(ROOT, 'trace_processor_shell'),
      },
      context,
      dependencies
    ),
  };
}

function editResult(folder: string, edit: (result: RunResult) => void) {
  const result = readResult(folder);
  edit(result);
  writeResult(folder, result);
}

describe('a stopped run', () => {
  it('keeps the samples of the scenario in progress and writes a provisional report', async () => {
    const folder = await stoppedRun();
    const result = readResult(folder);
    assert.equal(result.status, 'interrupted');
    assert.deepEqual(
      result.scenarios.map((outcome) => outcome.scenario),
      ['css']
    );
    assert.equal(result.incompleteScenario?.scenario, 'idle-cost');
    assert.equal(result.incompleteScenario?.samples.length, 1);
    assert.equal(result.segments[0].status, 'interrupted');
    assert.equal(result.appRefreshRate, 60);
    assert.equal(
      result.variants.a?.apkSha256,
      crypto.createHash('sha256').update('apk a').digest('hex')
    );
    assert.equal(result.statistics.length, 7);
    assert.ok(result.statistics.every((row) => row.scenario === 'css'));
    assert.equal(result.expectations[0].status, 'not decided');
    assert.deepEqual(result.expectations[0].scenariosWithoutData, [
      'idle-cost',
    ]);
    const report = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.ok(
      report.includes(
        'This run is not complete (status: interrupted). Scenarios without data: idle-cost.'
      )
    );
  });
});

describe('resumeCommand', () => {
  it('measures the block in progress again and keeps its samples as abandoned', async () => {
    const folder = await stoppedRun();
    const { run, installs } = resume(folder);
    assert.equal(await run, 0);
    const result = readResult(folder);
    assert.equal(result.status, 'done');
    assert.deepEqual(
      result.scenarios.map((outcome) => [
        outcome.scenario,
        outcome.samples.length,
      ]),
      [
        ['css', 4],
        ['idle-cost', 8],
      ]
    );
    assert.equal(result.incompleteScenario, null);
    assert.deepEqual(
      result.abandonedScenarios.map((outcome) => [
        outcome.scenario,
        outcome.segment,
        outcome.samples.length,
      ]),
      [['idle-cost', 0, 1]]
    );
    assert.deepEqual(
      result.segments.map((segment) => segment.status),
      ['interrupted', 'done']
    );
    assert.equal(result.statistics.length, 14);
    assert.deepEqual(installs, [apkOf('a'), apkOf('b')]);
    const report = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.ok(!report.includes('not complete'));
    assert.match(report, /\| 1 \| \S+ \| \S+ \| done \| 80% \| 30 °C \|/);
    assert.ok(
      fs
        .readdirSync(path.join(folder, 'traces'))
        .every((file) => !file.endsWith('.perfetto-trace'))
    );
  });

  it('keeps the accepted blocks of the incomplete scenario', async () => {
    const folder = await stoppedRun({ interruptAtTrace: 10, keepTraces: true });
    assert.deepEqual(
      readResult(folder).incompleteScenario?.samples.map((sample) => [
        sample.block,
        sample.segment,
        sample.accepted,
      ]),
      [
        [0, 0, true],
        [0, 0, true],
        [0, 0, true],
        [0, 0, true],
        [1, 0, false],
      ]
    );
    assert.equal(await resume(folder).run, 0);
    const result = readResult(folder);
    const idleCost = result.scenarios.find(
      (outcome) => outcome.scenario === 'idle-cost'
    );
    assert.deepEqual(
      idleCost?.samples.map((sample) => [
        sample.block,
        sample.segment,
        sample.attempt,
        sample.accepted,
      ]),
      [
        ...[0, 0, 0, 0].map((block) => [block, 0, 0, true]),
        ...[1, 1, 1, 1].map((block) => [block, 1, 0, true]),
      ]
    );
    assert.deepEqual(
      result.abandonedScenarios.map((outcome) => [
        outcome.scenario,
        outcome.segment,
        outcome.samples.map((sample) => [sample.block, sample.segment]),
      ]),
      [['idle-cost', 0, [[1, 0]]]]
    );
    const idleCostRows = result.statistics.filter(
      (row) => row.scenario === 'idle-cost'
    );
    assert.equal(idleCostRows.length, 7);
    assert.ok(
      idleCostRows.every((row) => row.samplesA === 4 && row.samplesB === 4)
    );
    const traces = [...result.scenarios, ...result.abandonedScenarios].flatMap(
      (outcome) => outcome.samples.map((sample) => sample.trace)
    );
    assert.equal(new Set(traces).size, 13);
    assert.equal(
      fs
        .readdirSync(path.join(folder, 'traces'))
        .filter((file) => file.endsWith('.perfetto-trace')).length,
      13
    );
    const report = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.ok(
      report.includes(
        '- idle-cost: block 0 in segment 0, block 1 in segment 1.'
      )
    );
  });

  it('reads a result without sample segments', async () => {
    const folder = await stoppedRun({ interruptAtTrace: 10 });
    editResult(folder, (result) => {
      result.segments.push({ ...result.segments[0] });
      for (const outcome of [result.scenarios[0], result.incompleteScenario]) {
        outcome?.samples.forEach(
          (sample) => delete (sample as Partial<SampleRecord>).segment
        );
      }
    });
    const result = readResult(folder);
    assert.ok(
      result.scenarios[0].samples.every((sample) => sample.segment === 0)
    );
    assert.ok(
      result.incompleteScenario?.samples.every((sample) => sample.segment === 1)
    );
  });

  it('closes a segment that ended without cleanup', async () => {
    const folder = await stoppedRun();
    editResult(folder, (result) => {
      result.status = 'running';
      result.segments[0].status = 'running';
    });
    await resume(folder).run;
    assert.deepEqual(
      readResult(folder).segments.map((segment) => segment.status),
      ['interrupted', 'done']
    );
  });

  it('refuses a run that is done', async () => {
    const folder = await stoppedRun();
    await resume(folder).run;
    await assert.rejects(resume(folder).run, /The run is done/);
  });

  it('refuses another device', async () => {
    const folder = await stoppedRun();
    await assert.rejects(
      resume(folder, { state: { ...STATE, hardwareSerial: 'OTHER' } }).run,
      /not the same as at the start of the run: hardwareSerial: HW1 -> OTHER/
    );
  });

  it('refuses an APK that changed or a run folder without the APK hash', async () => {
    const folder = await stoppedRun();
    fs.writeFileSync(apkOf('b'), 'other apk');
    await assert.rejects(
      resume(folder).run,
      /The APK of variant b changed after the run started/
    );
    editResult(folder, (result) => {
      delete (result.variants.a as Partial<RunVariant>).apkSha256;
    });
    await assert.rejects(
      resume(folder).run,
      /no APK hash of variant a\. This run cannot resume/
    );
  });

  it('refuses a build that does not exist any more', async () => {
    const folder = await stoppedRun();
    fs.rmSync(apkOf('a'));
    await assert.rejects(
      resume(folder).run,
      /The build of variant a does not exist any more/
    );
  });

  it('refuses other tool versions and another device state', async () => {
    const folder = await stoppedRun();
    await assert.rejects(
      resume(folder, { toolVersion: '2.0' }).run,
      /The tool versions changed after the run started: adb: 1\.0 -> 2\.0/
    );
    await assert.rejects(
      resume(folder, { state: { ...STATE, brightness: 50 } }).run,
      /not the same as at the start of the run: brightness: 102 -> 50/
    );
    assert.equal(readResult(folder).segments.length, 1);
  });
});
