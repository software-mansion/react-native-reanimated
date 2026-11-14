import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { DeviceStateGuard } from '../android-device.mts';
import type { ActivityStart, DeviceState } from '../android-device.mts';
import { takeSample } from '../android-protocol.mts';
import type { SampleDevice, SampleRequest } from '../android-protocol.mts';
import { parseReportLine } from '../app-report.mts';
import type { Clock } from '../clock.mts';
import { ToolError } from '../errors.mts';
import type { FrameBasis } from '../frames.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { TracedApp, TraceMetrics, TraceReading } from '../perfetto.mts';

const TRACE_METRICS: TraceMetrics = {
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
  otherThreadsCpu: 140,
  processCpu: 400,
  uiThreadCpuWork: 240000,
  processCpuWork: 800000,
  mountBatchCount: 590,
  memory: 150000,
  windowMemoryDelta: 100,
  frameCount: 600,
  expectedFrameCount: 600,
};

const STATE: DeviceState = {
  model: 'Pixel',
  deviceId: 'HW1',
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

const IN_APP_STATE: DeviceState = { ...STATE, refreshRate: 60 };
const PID = 4321;
const TRACES_DIR = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `protocol-${process.pid}`
);

before(() => fs.mkdirSync(TRACES_DIR, { recursive: true }));
after(() => fs.rmSync(TRACES_DIR, { recursive: true, force: true }));

function request(
  name: string,
  overrides: Partial<SampleRequest> = {}
): SampleRequest {
  return {
    applicationId: 'com.reanimatedbenchmark.a',
    stopApplicationIds: [
      'com.reanimatedbenchmark.a',
      'com.reanimatedbenchmark.b',
    ],
    scenario: 'css',
    baselineTemperature: 30,
    guard: new DeviceStateGuard(STATE),
    traceFile: path.join(TRACES_DIR, `${name}.perfetto-trace`),
    keepTrace: true,
    ...overrides,
  };
}

interface FakeOptions {
  reportLines?: string[];
  linesDuringTrace?: string[];
  linesDuringPidReadAfterTrace?: string[];
  start?: ActivityStart;
  dies?: boolean;
  pidAfterTrace?: number | null;
  thermal?: number[];
  temperatures?: number[];
  states?: DeviceState[];
  frameCount?: number;
  reading?: TraceReading;
  streamFailure?: 'before READY' | 'during the trace';
}

function createFake(options: FakeOptions = {}) {
  let time = 0;
  let traced = false;
  let streamFailure: ToolError | null = null;
  const calls: string[] = [];
  const collected: { app: TracedApp; frames: FrameBasis }[] = [];
  const thermal = [...(options.thermal ?? [])];
  const temperatures = [...(options.temperatures ?? [])];
  const states = [...(options.states ?? [IN_APP_STATE, IN_APP_STATE])];
  let onLine: ((line: string) => void) | null = null;
  const failStream = () => {
    streamFailure = new ToolError('adb logcat stopped before the driver');
  };
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
      if (onLine && time >= 3000) {
        (
          options.reportLines ?? [
            'READY scenario=css version=1 load=40 jsThread=4350',
          ]
        ).forEach(onLine);
        if (options.streamFailure === 'before READY') {
          failStream();
        }
      }
    },
  };
  const device: SampleDevice = {
    forceStop: async (id) => void calls.push(`stop ${id}`),
    readState: async () => {
      calls.push('read state');
      return states.shift() ?? IN_APP_STATE;
    },
    readThermalStatus: async () => thermal.shift() ?? 0,
    readBatteryTemperature: async () => temperatures.shift() ?? 30,
    clearLog: async () => void calls.push('clear log'),
    startActivity: async (id, scenario) => {
      calls.push(`start ${id} ${scenario}`);
      return options.start ?? { started: true, totalTime: 512 };
    },
    streamReports: (listener) => {
      onLine = listener;
      return {
        stop: () => {
          onLine = null;
          calls.push('stop stream');
        },
        failure: () => streamFailure,
      };
    },
    readPid: async () => {
      if (options.dies) {
        return null;
      }
      if (!traced) {
        return PID;
      }
      (options.linesDuringPidReadAfterTrace ?? []).forEach((line) =>
        onLine?.(line)
      );
      if (options.pidAfterTrace === undefined) {
        return PID;
      }
      return options.pidAfterTrace;
    },
    push: async (local, remote) => {
      const config = fs.readFileSync(local, 'utf8');
      calls.push(
        `push ${remote} ${config.includes('atrace_apps: "com.reanimatedbenchmark.a"')}`
      );
    },
    recordTrace: async (config, trace) => {
      calls.push(`trace ${config} ${trace}`);
      (options.linesDuringTrace ?? []).forEach((line) => onLine?.(line));
      if (options.streamFailure === 'during the trace') {
        failStream();
      }
      traced = true;
    },
    pull: async (remote, local) => {
      calls.push(`pull ${path.basename(remote)}`);
      fs.mkdirSync(path.dirname(local), { recursive: true });
      fs.writeFileSync(local, 'trace');
    },
    remove: async (remote) =>
      void calls.push(`remove ${path.basename(remote)}`),
  };
  const collector = {
    collect: async (
      _tracePath: string,
      app: TracedApp,
      frames: FrameBasis
    ): Promise<TraceReading> => {
      collected.push({ app, frames });
      return (
        options.reading ?? {
          processLived: true,
          metrics: { ...TRACE_METRICS, frameCount: options.frameCount ?? 600 },
        }
      );
    },
  };
  return { clock, device, collector, calls, collected };
}

function causeOf(sample: Awaited<ReturnType<typeof takeSample>>) {
  return sample.valid ? null : { cause: sample.cause, detail: sample.detail };
}

describe('parseReportLine', () => {
  it('reads READY and FAILED lines', () => {
    assert.deepEqual(
      parseReportLine('READY scenario=css version=1 load=40 jsThread=4350\r'),
      {
        kind: 'ready',
        scenario: 'css',
        version: 1,
        load: 40,
        jsThread: 4350,
      }
    );
    assert.deepEqual(
      parseReportLine('FAILED scenario=none reason=no scenario given'),
      {
        kind: 'failed',
        scenario: 'none',
        reason: 'no scenario given',
      }
    );
    assert.equal(parseReportLine('--------- beginning of main'), null);
    assert.equal(parseReportLine('READY scenario=css version=x load=1'), null);
    assert.equal(
      parseReportLine('READY scenario=css version=1 load=1 jsThread=x'),
      null
    );
  });

  it('reads a READY line of an old app without the JS thread id', () => {
    assert.deepEqual(parseReportLine('READY scenario=css version=1 load=40'), {
      kind: 'ready',
      scenario: 'css',
      version: 1,
      load: 40,
      jsThread: null,
    });
  });
});

describe('takeSample', () => {
  it('runs the protocol and gives the metrics with the cold start time', async () => {
    const fake = createFake();
    const req = request('valid');
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.equal(sample.valid, true);
    assert.deepEqual(sample.report, { version: 1, load: 40, jsThread: 4350 });
    assert.equal(sample.pid, PID);
    assert.equal(sample.metrics?.coldStart, 512);
    assert.equal(sample.trace, req.traceFile);
    assert.equal(sample.timings.wait, 10_000);
    assert.equal(fs.existsSync(`${req.traceFile}.pbtxt`), false);
    const remote = 'reanimated-benchmark-valid.perfetto-trace';
    const config = `/data/misc/perfetto-configs/${remote}.pbtxt`;
    assert.deepEqual(fake.calls, [
      'stop com.reanimatedbenchmark.a',
      'stop com.reanimatedbenchmark.b',
      'clear log',
      'start com.reanimatedbenchmark.a css',
      'read state',
      `push ${config} true`,
      `trace ${config} /data/misc/perfetto-traces/${remote}`,
      'read state',
      'stop com.reanimatedbenchmark.a',
      `pull ${remote}`,
      `remove ${remote}`,
      `remove ${remote}.pbtxt`,
      'stop stream',
      'stop com.reanimatedbenchmark.a',
    ]);
  });

  it('waits until the device is cool again', async () => {
    const fake = createFake({ thermal: [1, 0], temperatures: [30, 33, 31] });
    const sample = await takeSample(
      request('cool'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.equal(sample.valid, true);
    assert.equal(sample.timings.wait, 20_000);
  });

  it('stops the run when the device does not cool down in 10 minutes', async () => {
    const fake = createFake({ thermal: Array.from({ length: 200 }, () => 2) });
    await assert.rejects(
      takeSample(request('hot'), fake.device, fake.collector, fake.clock),
      /did not settle in 10 minutes/
    );
  });

  it('gives a crash for a FAILED line before READY', async () => {
    const fake = createFake({
      reportLines: ['FAILED scenario=css reason=TypeError: x'],
    });
    const sample = await takeSample(
      request('failed'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.equal(causeOf(sample)?.cause, 'crash');
    assert.match(causeOf(sample)?.detail ?? '', /TypeError: x/);
  });

  it('gives a crash when the app process dies before READY', async () => {
    const fake = createFake({ dies: true, reportLines: [] });
    const sample = await takeSample(
      request('dies'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: 'the app process died',
    });
  });

  it('gives a crash when no READY line comes in 60 s', async () => {
    const fake = createFake({
      reportLines: ['READY scenario=other version=1 load=1 jsThread=4350'],
    });
    const sample = await takeSample(
      request('no-ready'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: 'no READY line in 60 s',
    });
  });

  it('gives a crash when the activity does not start', async () => {
    const fake = createFake({
      start: { started: false, reason: 'Error: no activity' },
    });
    const sample = await takeSample(
      request('no-start'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: 'Error: no activity',
    });
  });

  it('gives a crash and keeps the trace for a FAILED line during the trace', async () => {
    const fake = createFake({
      linesDuringTrace: ['FAILED scenario=css reason=RangeError: y'],
    });
    const req = request('failed-in-trace', { keepTrace: false });
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: 'FAILED scenario=css reason=RangeError: y',
    });
    assert.equal(sample.trace, req.traceFile);
    assert.ok(fs.existsSync(req.traceFile));
    assert.equal(fake.collected.length, 0);
  });

  it('gives a crash and keeps the trace for a FAILED line during the process check after the trace', async () => {
    const fake = createFake({
      linesDuringPidReadAfterTrace: ['FAILED scenario=css reason=Error: late'],
    });
    const req = request('failed-after-trace', { keepTrace: false });
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: 'FAILED scenario=css reason=Error: late',
    });
    assert.equal(sample.trace, req.traceFile);
    assert.ok(fs.existsSync(req.traceFile));
    assert.equal(fake.collected.length, 0);
  });

  it('gives a crash and keeps the trace when the app process dies during the trace', async () => {
    const fake = createFake({ pidAfterTrace: null });
    const req = request('died-in-trace', { keepTrace: false });
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: `the app process ${PID} died during the trace`,
    });
    assert.ok(fs.existsSync(req.traceFile));
  });

  it('gives a crash when another process of the app runs after the trace', async () => {
    const fake = createFake({ pidAfterTrace: 9999 });
    const sample = await takeSample(
      request('restarted'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: `the app process ${PID} ended during the trace, process 9999 runs now`,
    });
  });

  it('reads the trace of the process that it launched', async () => {
    const fake = createFake();
    await takeSample(request('pid'), fake.device, fake.collector, fake.clock);
    assert.deepEqual(fake.collected, [
      {
        app: {
          applicationId: 'com.reanimatedbenchmark.a',
          pid: PID,
          jsThread: 4350,
        },
        frames: { refreshRate: 60, share: 1 },
      },
    ]);
  });

  it('expects a frame on each refresh in idle-cost, because the app requests a frame on each refresh', async () => {
    const fake = createFake({
      reportLines: ['READY scenario=idle-cost version=1 load=40 jsThread=4350'],
      frameCount: 539,
    });
    const sample = await takeSample(
      request('idle-cost', { scenario: 'idle-cost' }),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(fake.collected[0].frames, { refreshRate: 60, share: 1 });
    assert.deepEqual(causeOf(sample), {
      cause: 'frames',
      detail: '539 frames, expected at least 540',
    });
  });

  it('stops with a tool error when the READY line has no JS thread id', async () => {
    const fake = createFake({
      reportLines: ['READY scenario=css version=1 load=40'],
    });
    await assert.rejects(
      takeSample(request('old-app'), fake.device, fake.collector, fake.clock),
      (error) =>
        error instanceof ToolError &&
        /READY line of com\.reanimatedbenchmark\.a has no jsThread field/.test(
          error.message
        )
    );
    assert.equal(fake.collected.length, 0);
    assert.ok(fake.calls.includes('stop stream'));
  });

  it('gives a crash and keeps the trace when the trace shows that the process ended', async () => {
    const fake = createFake({
      reading: { processLived: false, detail: 'the app process ended' },
    });
    const req = request('ended-in-trace', { keepTrace: false });
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'crash',
      detail: 'the app process ended',
    });
    assert.ok(fs.existsSync(req.traceFile));
  });

  it('stops with a tool error when the log stream stops before READY', async () => {
    const fake = createFake({ reportLines: [], streamFailure: 'before READY' });
    await assert.rejects(
      takeSample(request('stream'), fake.device, fake.collector, fake.clock),
      (error) => error instanceof ToolError && /logcat/.test(error.message)
    );
  });

  it('stops with a tool error when the log stream stops during the trace', async () => {
    const fake = createFake({ streamFailure: 'during the trace' });
    await assert.rejects(
      takeSample(
        request('stream-trace'),
        fake.device,
        fake.collector,
        fake.clock
      ),
      (error) => error instanceof ToolError && /logcat/.test(error.message)
    );
    assert.ok(fake.calls.includes('stop stream'));
  });

  it('gives thermal when the status is above 0 before or after the trace', async () => {
    const before = createFake({
      states: [{ ...IN_APP_STATE, thermalStatus: 1 }],
    });
    const sampleBefore = await takeSample(
      request('thermal-before'),
      before.device,
      before.collector,
      before.clock
    );
    assert.equal(causeOf(sampleBefore)?.cause, 'thermal');
    assert.ok(!before.calls.some((call) => call.startsWith('trace')));

    const afterTrace = createFake({
      states: [IN_APP_STATE, { ...IN_APP_STATE, thermalStatus: 2 }],
    });
    const req = request('thermal-after');
    const sampleAfter = await takeSample(
      req,
      afterTrace.device,
      afterTrace.collector,
      afterTrace.clock
    );
    assert.deepEqual(causeOf(sampleAfter), {
      cause: 'thermal',
      detail: 'thermal status 2 after the trace',
    });
    assert.equal(sampleAfter.trace, req.traceFile);
  });

  it('gives frames when the app drew fewer than 90% of the expected frames', async () => {
    const fake = createFake({ frameCount: 539 });
    const sample = await takeSample(
      request('frames'),
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'frames',
      detail: '539 frames, expected at least 540',
    });
    assert.equal(sample.metrics?.frameCount, 539);
  });

  it('gives frames when the app drew no frame in the trace', async () => {
    const fake = createFake({
      reading: {
        processLived: true,
        metrics: {
          ...TRACE_METRICS,
          frameDurationMedian: null,
          frameDurationP90: null,
          frameDurationP95: null,
          frameDurationP99: null,
          jankyFrames: 1,
          frameCount: 0,
        },
      },
    });
    const req = request('no-frames', { keepTrace: false });
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'frames',
      detail: '0 frames, expected at least 540',
    });
    assert.equal(sample.metrics?.frameDurationMedian, null);
    assert.ok(fs.existsSync(req.traceFile));
  });

  it('gives work when a scenario with a minimum makes too few mount batches', async () => {
    const fake = createFake({
      reportLines: [
        'READY scenario=shared-elements version=1 load=40 jsThread=4350',
      ],
      reading: {
        processLived: true,
        metrics: { ...TRACE_METRICS, mountBatchCount: 38 },
      },
    });
    const req = request('no-transitions', {
      scenario: 'shared-elements',
      keepTrace: false,
    });
    const sample = await takeSample(
      req,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.deepEqual(causeOf(sample), {
      cause: 'work',
      detail: '38 mount batches, expected at least 300',
    });
    assert.ok(fs.existsSync(req.traceFile));
  });

  it('accepts the minimum of mount batches and has no minimum for other scenarios', async () => {
    const atMinimum = createFake({
      reportLines: [
        'READY scenario=shared-elements version=1 load=40 jsThread=4350',
      ],
      reading: {
        processLived: true,
        metrics: { ...TRACE_METRICS, mountBatchCount: 300 },
      },
    });
    const sharedElements = await takeSample(
      request('at-minimum', { scenario: 'shared-elements' }),
      atMinimum.device,
      atMinimum.collector,
      atMinimum.clock
    );
    assert.equal(sharedElements.valid, true);

    const noMinimum = createFake({
      reading: {
        processLived: true,
        metrics: { ...TRACE_METRICS, mountBatchCount: 0 },
      },
    });
    const css = await takeSample(
      request('no-minimum'),
      noMinimum.device,
      noMinimum.collector,
      noMinimum.clock
    );
    assert.equal(css.valid, true);
  });

  it('removes the local trace of a valid sample unless it must keep it', async () => {
    const removed = request('removed', { keepTrace: false });
    const fake = createFake();
    const sample = await takeSample(
      removed,
      fake.device,
      fake.collector,
      fake.clock
    );
    assert.equal(sample.valid, true);
    assert.equal(sample.trace, undefined);
    assert.ok(fake.calls.some((call) => call.startsWith('pull')));
    assert.equal(fs.existsSync(removed.traceFile), false);

    const kept = request('kept');
    const keptFake = createFake();
    await takeSample(kept, keptFake.device, keptFake.collector, keptFake.clock);
    assert.ok(fs.existsSync(kept.traceFile));
  });

  it('uses the refresh rate of the running app and stops when it changes', async () => {
    const guard = new DeviceStateGuard(STATE);
    const first = createFake();
    const sample = await takeSample(
      request('rate-first', { guard }),
      first.device,
      first.collector,
      first.clock
    );
    assert.equal(sample.refreshRate, 60);
    assert.equal(first.collected[0].frames.refreshRate, 60);

    const second = createFake({
      states: [{ ...IN_APP_STATE, refreshRate: 90 }],
    });
    await assert.rejects(
      takeSample(
        request('rate-second', { guard }),
        second.device,
        second.collector,
        second.clock
      ),
      /device state changed \(read before the trace\): refreshRate: 60 -> 90/
    );
  });

  it('stops when the device state changes during the trace', async () => {
    const fake = createFake({
      states: [IN_APP_STATE, { ...IN_APP_STATE, brightness: 50 }],
    });
    await assert.rejects(
      takeSample(
        request('brightness'),
        fake.device,
        fake.collector,
        fake.clock
      ),
      /device state changed \(read after the trace\): brightness: 102 -> 50/
    );
  });
});
