import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { ToolError } from '../errors.mts';
import {
  HOT_DEVICE_WAIT_MS,
  InAppStateGuard,
  MINIMUM_WAIT_MS,
  launchOnce,
  parseLaunchLine,
  takeIosSample,
} from '../ios-protocol.mts';
import type { IosSampleContext } from '../ios-protocol.mts';
import { REPOSITORY_ROOT } from '../paths.mts';
import type { SampleOrder } from '../platform.mts';
import type { Clock } from '../protocol.mts';
import type {
  AppState,
  IosTraceMetrics,
  IosTraceReading,
} from '../xctrace-metrics.mts';

const ROOT = path.join(
  REPOSITORY_ROOT,
  '.tmp',
  'benchmarks',
  'tests',
  `ios-protocol-${process.pid}`
);
const APP = 'com.reanimatedbenchmark.a';
const LAUNCHED = `Launched application with ${APP} bundle identifier.`;
const LAUNCH =
  'ReanimatedBenchmark: LAUNCH pid=812 mainThread=5001 refreshRate=60 thermal=0 coldStart=81.25';
const READY =
  'ReanimatedBenchmark: READY scenario=css version=1 load=80 jsThread=5002';
const STATE: AppState = {
  batteryLevel: 100,
  batteryState: 'full',
  lowPowerMode: false,
  brightness: 50,
};
const METRICS: IosTraceMetrics = {
  frameDurationMedian: 6,
  frameDurationP90: 7,
  frameDurationP95: 8,
  frameDurationP99: 9,
  jankyFrames: 0,
  uiThreadCpu: 350,
  jsThreadCpu: 2,
  otherThreadsCpu: 1,
  processCpu: 353,
  mountBatchCount: 600,
  memory: 40000,
  windowMemoryDelta: 300,
  frameCount: 600,
  expectedFrameCount: 600,
  uiThreadEfficiencyCoreShare: 0.7,
  hitchCount: 0,
  hitchTime: 0,
};

interface FakeOptions {
  recordError?: string;
  terminateErrorAt?: number;
  launchedLate?: string[];
  lines?: string[];
  launches?: string[][];
  endsAfterLines?: boolean;
  endsDuringTrace?: boolean;
  linesDuringTrace?: string[];
  reading?: Partial<Extract<IosTraceReading, { processLived: true }>>;
  metrics?: Partial<IosTraceMetrics>;
  dead?: boolean;
}

function order(overrides: Partial<SampleOrder> = {}): SampleOrder {
  return {
    applicationId: APP,
    stopApplicationIds: [APP, 'com.reanimatedbenchmark.b'],
    scenario: 'css',
    traceFile: path.join(ROOT, 'sample.trace'),
    keepTrace: false,
    ...overrides,
  };
}

function createFake(options: FakeOptions = {}) {
  let time = 0;
  let ended = false;
  let stopped = false;
  const scriptedLaunches = [...(options.launches ?? [])];
  let write: (line: string) => void = () => {};
  const calls: string[] = [];
  const sleeps: number[] = [];
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
      if (time > 60_000) {
        (options.launchedLate ?? []).splice(0).forEach(write);
      }
    },
  };
  const context: IosSampleContext = {
    device: {
      terminate: async (applicationId) => {
        calls.push(`terminate ${applicationId}`);
        if (calls.length === options.terminateErrorAt) {
          throw new ToolError('CLEANUP ERROR');
        }
      },
      launch: (applicationId, scenario, load, onLine) => {
        calls.push(`launch ${applicationId} ${scenario} ${load}`);
        write = onLine;
        stopped = false;
        (
          scriptedLaunches.shift() ??
          options.lines ?? [LAUNCHED, LAUNCH, READY]
        ).forEach(onLine);
        ended = options.endsAfterLines ?? false;
        return {
          stop: () => {
            stopped = true;
          },
          failure: () =>
            ended && !stopped
              ? new ToolError('devicectl stopped (exit 1):\nERROR: no device')
              : null,
        };
      },
    },
    deviceName: 'Test iPhone',
    tracer: {
      record: async (deviceName, pid, traceFile) => {
        calls.push(`record ${deviceName} ${pid}`);
        fs.mkdirSync(traceFile, { recursive: true });
        (options.linesDuringTrace ?? []).forEach(write);
        ended ||= options.endsDuringTrace ?? false;
        if (options.recordError) {
          throw new ToolError(options.recordError);
        }
      },
      collect: async (_traceFile, app) => {
        calls.push(
          `collect ${app.pid} ${app.mainThread} ${app.jsThread} ${app.refreshRate}`
        );
        return options.dead
          ? { processLived: false, detail: 'the app process 812 ended' }
          : {
              processLived: true,
              metrics: { ...METRICS, ...options.metrics },
              thermalState: 0,
              appStates: [STATE, STATE, STATE],
              ...options.reading,
            };
      },
    },
    clock,
    guard: new InAppStateGuard(null),
  };
  return { context, calls, sleeps };
}

before(() => fs.mkdirSync(ROOT, { recursive: true }));
after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

describe('parseLaunchLine', () => {
  it('reads the LAUNCH line of the app', () => {
    assert.deepEqual(
      parseLaunchLine(
        'LAUNCH pid=8865 mainThread=3840236 refreshRate=60 thermal=1 coldStart=435.972'
      ),
      {
        pid: 8865,
        mainThread: 3840236,
        refreshRate: 60,
        thermalState: 1,
        coldStart: 435.972,
      }
    );
  });

  it('gives null for other lines', () => {
    assert.equal(parseLaunchLine('LAUNCH pid=1 mainThread=2'), null);
    assert.equal(parseLaunchLine('READY scenario=css version=1 load=1'), null);
  });
});

describe('takeIosSample', () => {
  it('stops the apps, waits, launches, records, stops the app and reads the trace', async () => {
    const { context, calls, sleeps } = createFake();
    const sample = await takeIosSample(order({ load: 7 }), context);
    assert.deepEqual(calls, [
      `terminate ${APP}`,
      'terminate com.reanimatedbenchmark.b',
      `launch ${APP} css 7`,
      'record Test iPhone 812',
      `terminate ${APP}`,
      'collect 812 5001 5002 60',
    ]);
    assert.equal(sleeps[0], MINIMUM_WAIT_MS);
    assert.equal(sample.valid, true);
    assert.equal(sample.metrics?.coldStart, 81.25);
    assert.equal(sample.metrics?.uiThreadCpu, 350);
    assert.equal(sample.pid, 812);
    assert.equal(sample.refreshRate, 60);
    assert.deepEqual(sample.report, { version: 1, load: 80, jsThread: 5002 });
    assert.deepEqual(sample.inAppState, { refreshRate: 60, ...STATE });
    assert.equal(sample.trace, undefined);
    assert.ok(!fs.existsSync(order().traceFile));
  });

  it('keeps the trace on request', async () => {
    const { context } = createFake();
    const sample = await takeIosSample(order({ keepTrace: true }), context);
    assert.equal(sample.trace, order().traceFile);
    assert.ok(fs.existsSync(order().traceFile));
  });

  it('is a crash when the app writes FAILED', async () => {
    const { context, calls } = createFake({
      lines: [
        LAUNCHED,
        LAUNCH,
        'ReanimatedBenchmark: FAILED scenario=css reason=no flag',
      ],
    });
    const sample = await takeIosSample(order(), context);
    assert.equal(sample.valid, false);
    assert.equal(!sample.valid && sample.cause, 'crash');
    assert.equal(
      !sample.valid && sample.detail,
      'FAILED scenario=css reason=no flag'
    );
    assert.ok(!calls.some((call) => call.startsWith('record')));
    assert.equal(calls.at(-1), `terminate ${APP}`);
  });

  it('is a crash when the app ends before READY, during the trace, or in the trace data', async () => {
    const early = await takeIosSample(
      order(),
      createFake({ lines: [LAUNCHED, LAUNCH], endsAfterLines: true }).context
    );
    assert.equal(!early.valid && early.detail, 'the app process ended');

    const beforeTrace = createFake({
      lines: [LAUNCHED, LAUNCH, READY],
      endsAfterLines: true,
    });
    const notTraced = await takeIosSample(order(), beforeTrace.context);
    assert.equal(
      !notTraced.valid && notTraced.detail,
      'the app process 812 ended before the trace'
    );
    assert.ok(!beforeTrace.calls.some((call) => call.startsWith('record')));

    const during = await takeIosSample(
      order(),
      createFake({ endsDuringTrace: true }).context
    );
    assert.equal(
      !during.valid && during.detail,
      'the app process 812 ended during the trace'
    );
    assert.equal(during.trace, order().traceFile);

    const late = await takeIosSample(
      order(),
      createFake({
        linesDuringTrace: ['ReanimatedBenchmark: FAILED scenario=css reason=x'],
      }).context
    );
    assert.equal(!late.valid && late.detail, 'FAILED scenario=css reason=x');

    const dead = await takeIosSample(
      order(),
      createFake({ dead: true }).context
    );
    assert.equal(!dead.valid && dead.detail, 'the app process 812 ended');
  });

  it('is a crash when the recording fails because the app ended, and a tool error when the app lives', async () => {
    const sample = await takeIosSample(
      order(),
      createFake({ endsDuringTrace: true, recordError: 'xctrace failed' })
        .context
    );
    assert.equal(
      !sample.valid && sample.detail,
      'the app process 812 ended during the trace'
    );
    await assert.rejects(
      takeIosSample(
        order(),
        createFake({ recordError: 'xctrace failed' }).context
      ),
      /xctrace failed/
    );
  });

  it('keeps the first error when the stop of the app fails after it', async () => {
    await assert.rejects(
      takeIosSample(
        order(),
        createFake({ recordError: 'TRACE ERROR', terminateErrorAt: 5 }).context
      ),
      /TRACE ERROR/
    );
  });

  it('is a crash when LAUNCH does not come in the time limit, also when it comes later', async () => {
    const { context, calls } = createFake({
      lines: [LAUNCHED],
      launchedLate: [LAUNCH.replace('thermal=0', 'thermal=1'), READY],
    });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.detail, 'no LAUNCH line in 60 s');
    assert.ok(!calls.some((call) => call.startsWith('record')));
  });

  it('is a tool error when the launch command does not start the app in the time limit', async () => {
    await assert.rejects(
      takeIosSample(order(), createFake({ lines: [] }).context),
      /The launch command did not start the app in 60 s/
    );
  });

  it('is a crash when READY does not come in the time limit', async () => {
    const { context } = createFake({ lines: [LAUNCHED, LAUNCH] });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.detail, 'no READY line in 60 s');
  });

  it('is a tool error when the launch command fails', async () => {
    const { context } = createFake({ lines: [], endsAfterLines: true });
    await assert.rejects(
      takeIosSample(order(), context),
      /The app did not start: devicectl stopped \(exit 1\):\nERROR: no device/
    );
  });

  it('is a tool error when the READY line has no LAUNCH line or no jsThread', async () => {
    await assert.rejects(
      takeIosSample(order(), createFake({ lines: [LAUNCHED, READY] }).context),
      /wrote READY but no LAUNCH line/
    );
    await assert.rejects(
      takeIosSample(
        order(),
        createFake({
          lines: [
            LAUNCHED,
            LAUNCH,
            'ReanimatedBenchmark: READY scenario=css version=1 load=80',
          ],
        }).context
      ),
      /has no jsThread field/
    );
  });

  it('ignores the READY line of a different scenario', async () => {
    const { context } = createFake({
      lines: [
        LAUNCHED,
        LAUNCH,
        'ReanimatedBenchmark: READY scenario=idle-cost version=1 load=1 jsThread=1',
      ],
    });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.detail, 'no READY line in 60 s');
  });

  it('is invalid for a thermal state above nominal in the trace', async () => {
    const { context } = createFake({ reading: { thermalState: 1 } });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.cause, 'thermal');
    assert.equal(
      !sample.valid && sample.detail,
      'thermal state Fair during the trace'
    );
    assert.equal(sample.trace, order().traceFile);
  });

  it('launches again after a wait when the device is hot at the launch', async () => {
    const hot = LAUNCH.replace('thermal=0', 'thermal=2');
    const { context, calls, sleeps } = createFake({
      launches: [
        [LAUNCHED, hot],
        [LAUNCHED, hot],
        [LAUNCHED, LAUNCH, READY],
      ],
    });
    const sample = await takeIosSample(order(), context);
    assert.equal(sample.valid, true);
    assert.deepEqual(calls.slice(2, 7), [
      `launch ${APP} css undefined`,
      `terminate ${APP}`,
      `launch ${APP} css undefined`,
      `terminate ${APP}`,
      `launch ${APP} css undefined`,
    ]);
    assert.deepEqual(sleeps, [
      MINIMUM_WAIT_MS,
      HOT_DEVICE_WAIT_MS,
      HOT_DEVICE_WAIT_MS,
    ]);
    assert.equal(sample.timings.wait, MINIMUM_WAIT_MS + 2 * HOT_DEVICE_WAIT_MS);
  });

  it('is a tool error when the device stays hot for 10 minutes', async () => {
    const hot = LAUNCH.replace('thermal=0', 'thermal=1');
    const { context } = createFake({ lines: [LAUNCHED, hot] });
    await assert.rejects(
      takeIosSample(order(), context),
      /The device did not settle in 10 minutes: thermal state Fair at the launch of the app/
    );
  });

  it('is a tool error for a display that is not a 60 Hz display', async () => {
    const { context } = createFake({
      lines: [
        LAUNCHED,
        LAUNCH.replace('refreshRate=60', 'refreshRate=120'),
        READY,
      ],
    });
    await assert.rejects(
      takeIosSample(order(), context),
      /maximum refresh rate of 120 Hz/
    );
  });

  it('is invalid for too few frames', async () => {
    const { context } = createFake({ metrics: { frameCount: 539 } });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.cause, 'frames');
    assert.equal(
      !sample.valid && sample.detail,
      '539 frames, expected at least 540'
    );
  });

  it('stops when the state of the device in the app changes', async () => {
    const { context } = createFake();
    await takeIosSample(order(), context);
    const changed = createFake({
      reading: {
        appStates: [STATE, { ...STATE, lowPowerMode: true }, STATE],
      },
    });
    changed.context.guard = context.guard;
    await assert.rejects(
      takeIosSample(order(), changed.context),
      /The device state changed \(read in the trace\): lowPowerMode: false -> true/
    );
  });
});

describe('InAppStateGuard', () => {
  it('uses the stored reference of the run', () => {
    const guard = new InAppStateGuard({ refreshRate: 60, ...STATE });
    assert.throws(
      () => guard.check({ refreshRate: 120, ...STATE }),
      /refreshRate: 60 -> 120/
    );
  });
});

describe('launchOnce', () => {
  it('launches the app with no scenario and stops it after the LAUNCH line', async () => {
    const { context, calls } = createFake({ lines: [LAUNCHED, LAUNCH] });
    await launchOnce(context.device, APP, context.clock);
    assert.deepEqual(calls, [
      `launch ${APP} undefined undefined`,
      `terminate ${APP}`,
    ]);
  });

  it('is a tool error when the app writes no LAUNCH line', async () => {
    const { context } = createFake({ lines: [LAUNCHED] });
    await assert.rejects(
      launchOnce(context.device, APP, context.clock),
      /did not write a LAUNCH line/
    );
  });
});
