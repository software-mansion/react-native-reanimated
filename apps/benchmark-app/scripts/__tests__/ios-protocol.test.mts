import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLaunchLine } from '../app-report.mts';
import type { Clock } from '../clock.mts';
import { ToolError } from '../errors.mts';
import { planArguments } from '../in-app-sample.mts';
import type { AppState } from '../in-app-sample.mts';
import {
  InAppStateGuard,
  launchOnce,
  takeIosSample,
} from '../ios-protocol.mts';
import type { IosSampleContext } from '../ios-protocol.mts';
import type { SampleOrder } from '../platform.mts';
import { MINIMUM_WAIT_MS, READY_TIMEOUT_MS } from '../samples.mts';
import {
  END_BOUNDARY,
  IOS_SAMPLE_METRICS,
  IOS_SAMPLE_WINDOW,
  SAMPLE_PREFIX,
  START_BOUNDARY,
  inAppSample,
  sampleLine,
  sampleText,
  steadyUpdates,
} from './ios-fixtures.mts';

const APP = 'com.reanimatedbenchmark.a';
const HOT_DEVICE_WAIT_MS = 30_000;
const REPORT_PREFIX = 'ReanimatedBenchmark: ';
const LAUNCHED = `Launched application with ${APP} bundle identifier.`;
const LAUNCH =
  'ReanimatedBenchmark: LAUNCH pid=812 mainThread=5001 refreshRate=60 thermal=0 coldStart=81.25';
const READY =
  'ReanimatedBenchmark: READY scenario=css version=1 load=80 jsThread=5002';
const SAMPLE = sampleLine();
const RUN_PLAN_ARGUMENTS =
  '-benchmarkEpochs none:full:10 -benchmarkStart ready';
const STATE: AppState = {
  batteryLevel: 100,
  batteryState: 'full',
  lowPowerMode: false,
  brightness: 50,
};

interface FakeOptions {
  terminateErrorAt?: number;
  linesAfter?: { ms: number; lines: string[] };
  lines?: string[];
  launches?: string[][];
  endsAfterLines?: boolean;
}

function order(overrides: Partial<SampleOrder> = {}): SampleOrder {
  return {
    applicationId: APP,
    stopApplicationIds: [APP, 'com.reanimatedbenchmark.b'],
    scenario: 'css',
    traceFile: '/unused/sample.trace',
    keepTrace: false,
    ...overrides,
  };
}

function createFake(options: FakeOptions = {}) {
  let time = 0;
  let launchedAt = 0;
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
      if (options.linesAfter && time - launchedAt >= options.linesAfter.ms) {
        options.linesAfter.lines.splice(0).forEach(write);
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
      launch: (applicationId, { scenario, load, plan }, onLine) => {
        calls.push(
          [
            'launch',
            applicationId,
            String(scenario),
            String(load),
            ...(plan ? planArguments(plan) : []),
          ].join(' ')
        );
        write = onLine;
        stopped = false;
        launchedAt = time;
        (
          scriptedLaunches.shift() ??
          options.lines ?? [LAUNCHED, LAUNCH, READY, SAMPLE]
        ).forEach(onLine);
        ended = options.endsAfterLines ?? false;
        return {
          stop: () => {
            calls.push('stop console');
            stopped = true;
          },
          failure: () =>
            ended && !stopped
              ? new ToolError('devicectl stopped (exit 1):\nERROR: no device')
              : null,
        };
      },
    },
    clock,
    guard: new InAppStateGuard(null),
  };
  return { context, calls, sleeps };
}

function withSample(...lines: string[]) {
  return createFake({ lines: [LAUNCHED, LAUNCH, ...lines] });
}

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
  it('stops the apps, waits, launches with the sample plan, reads the SAMPLE line and stops the app', async () => {
    const { context, calls, sleeps } = createFake();
    const sample = await takeIosSample(order({ load: 7 }), context);
    assert.deepEqual(calls, [
      `terminate ${APP}`,
      'terminate com.reanimatedbenchmark.b',
      `launch ${APP} css 7 ${RUN_PLAN_ARGUMENTS}`,
      'stop console',
      `terminate ${APP}`,
    ]);
    assert.equal(sleeps[0], MINIMUM_WAIT_MS);
    assert.equal(sample.valid, true);
    assert.deepEqual(sample.metrics, {
      ...IOS_SAMPLE_METRICS,
      coldStart: 81.25,
    });
    assert.deepEqual(sample.traceWindow, IOS_SAMPLE_WINDOW);
    assert.equal(sample.pid, 812);
    assert.equal(sample.refreshRate, 60);
    assert.equal(sample.thermalAfter, 0);
    assert.deepEqual(sample.report, { version: 1, load: 80, jsThread: 5002 });
    assert.deepEqual(sample.inAppState, { refreshRate: 60, ...STATE });
    assert.equal(sample.trace, undefined);
    assert.ok(sample.timings.measure !== undefined);
  });

  it('is a crash when the app writes FAILED before READY or before its SAMPLE line', async () => {
    const failed = 'ReanimatedBenchmark: FAILED scenario=css reason=no flag';
    for (const lines of [[failed], [READY, failed]]) {
      const { context, calls } = withSample(...lines);
      const sample = await takeIosSample(order(), context);
      assert.equal(!sample.valid && sample.cause, 'crash');
      assert.equal(
        !sample.valid && sample.detail,
        'FAILED scenario=css reason=no flag'
      );
      assert.equal(calls.at(-1), `terminate ${APP}`);
    }
  });

  it('is a crash when the app ends before READY or before its SAMPLE line', async () => {
    const early = await takeIosSample(
      order(),
      createFake({ lines: [LAUNCHED, LAUNCH], endsAfterLines: true }).context
    );
    assert.equal(!early.valid && early.detail, 'the app process ended');

    const late = await takeIosSample(
      order(),
      createFake({ lines: [LAUNCHED, LAUNCH, READY], endsAfterLines: true })
        .context
    );
    assert.equal(
      !late.valid && late.detail,
      'the app process 812 ended before its SAMPLE line'
    );
    assert.equal(late.pid, 812);
  });

  it('is a crash when the SAMPLE line does not come in the plan time and a margin', async () => {
    const { context, calls } = withSample(READY);
    const sample = await takeIosSample(order(), context);
    assert.equal(
      !sample.valid && sample.detail,
      'no SAMPLE line in 40 s after READY'
    );
    assert.equal(calls.at(-1), `terminate ${APP}`);
  });

  it('is a tool error when the sampler fails or measures other threads, and stops the app first', async () => {
    for (const [line, problem] of [
      [
        `${SAMPLE_PREFIX}${sampleText(inAppSample(), 'getrusage(RUSAGE_SELF) failed')}`,
        /The in-app sampler failed: getrusage/,
      ],
      [
        sampleLine(inAppSample({ jsThread: 7 })),
        /The SAMPLE line measured the threads 5001 and 7, the LAUNCH and READY lines name the main thread 5001 and the JS thread 5002/,
      ],
    ] as const) {
      const { context, calls } = withSample(READY, line);
      await assert.rejects(takeIosSample(order(), context), problem);
      assert.deepEqual(calls.slice(-2), ['stop console', `terminate ${APP}`]);
    }
  });

  it('keeps the first error when the stop of the app fails after it', async () => {
    const { context } = createFake({
      lines: [
        LAUNCHED,
        LAUNCH,
        READY,
        sampleLine(inAppSample({ jsThread: 7 })),
      ],
      terminateErrorAt: 5,
    });
    await assert.rejects(
      takeIosSample(order(), context),
      /The SAMPLE line measured the threads/
    );
  });

  it('is a crash when the LAUNCH line comes at its deadline, and stops the console and the app', async () => {
    const late = createFake({
      lines: [LAUNCHED],
      linesAfter: { ms: READY_TIMEOUT_MS, lines: [LAUNCH, READY, SAMPLE] },
    });
    const sample = await takeIosSample(order(), late.context);
    assert.equal(!sample.valid && sample.detail, 'no LAUNCH line in 60 s');
    assert.deepEqual(late.calls.slice(2), [
      `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
      'stop console',
      `terminate ${APP}`,
    ]);

    const inTime = createFake({
      lines: [LAUNCHED],
      linesAfter: {
        ms: READY_TIMEOUT_MS - 1000,
        lines: [LAUNCH, READY, SAMPLE],
      },
    });
    assert.equal((await takeIosSample(order(), inTime.context)).valid, true);
  });

  it('stops the console and the app and keeps the error when the launch is a tool error', async () => {
    for (const [lines, endsAfterLines, problem] of [
      [[], false, /The launch command did not start the app in 60 s/],
      [[LAUNCHED, READY], false, /wrote READY but no LAUNCH line/],
      [
        [],
        true,
        /The app did not start: devicectl stopped \(exit 1\):\nERROR: no device/,
      ],
    ] as const) {
      const fake = createFake({
        lines: [...lines],
        endsAfterLines,
        terminateErrorAt: 5,
      });
      await assert.rejects(takeIosSample(order(), fake.context), problem);
      assert.deepEqual(fake.calls.slice(2), [
        `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
        'stop console',
        `terminate ${APP}`,
      ]);
    }
  });

  it('stops the console of each hot launch before it launches again', async () => {
    const hot = LAUNCH.replace('thermal=0', 'thermal=1');
    const { context, calls } = createFake({
      launches: [
        [LAUNCHED, hot],
        [LAUNCHED, READY],
      ],
    });
    await assert.rejects(
      takeIosSample(order(), context),
      /wrote READY but no LAUNCH line/
    );
    assert.deepEqual(calls.slice(2), [
      `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
      'stop console',
      `terminate ${APP}`,
      `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
      'stop console',
      `terminate ${APP}`,
    ]);
  });

  it('does not accept a READY line that comes at its deadline', async () => {
    const { context } = createFake({
      lines: [LAUNCHED, LAUNCH],
      linesAfter: {
        ms: MINIMUM_WAIT_MS + READY_TIMEOUT_MS,
        lines: [READY, SAMPLE],
      },
    });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.detail, 'no READY line in 60 s');
  });

  it('is a crash when READY does not come in the time limit', async () => {
    const { context } = createFake({ lines: [LAUNCHED, LAUNCH] });
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.detail, 'no READY line in 60 s');
  });

  it('is a tool error when the READY line has no LAUNCH line or no jsThread', async () => {
    await assert.rejects(
      takeIosSample(order(), createFake({ lines: [LAUNCHED, READY] }).context),
      /wrote READY but no LAUNCH line/
    );
    await assert.rejects(
      takeIosSample(
        order(),
        withSample('ReanimatedBenchmark: READY scenario=css version=1 load=80')
          .context
      ),
      /has no jsThread field/
    );
  });

  it('ignores the READY line of a different scenario', async () => {
    const { context } = withSample(
      'ReanimatedBenchmark: READY scenario=idle-cost version=1 load=1 jsThread=1'
    );
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.detail, 'no READY line in 60 s');
  });

  it('is invalid for a thermal state above nominal in the sample window', async () => {
    const { context } = withSample(
      READY,
      sampleLine(inAppSample({ maxThermal: 1 }))
    );
    const sample = await takeIosSample(order(), context);
    assert.equal(!sample.valid && sample.cause, 'thermal');
    assert.equal(
      !sample.valid && sample.detail,
      'thermal state Fair in the sample window'
    );
  });

  it('launches again after a wait when the device is hot at the launch', async () => {
    const hot = LAUNCH.replace('thermal=0', 'thermal=2');
    const { context, calls, sleeps } = createFake({
      launches: [
        [LAUNCHED, hot],
        [LAUNCHED, hot],
        [LAUNCHED, LAUNCH, READY, SAMPLE],
      ],
    });
    const sample = await takeIosSample(order(), context);
    assert.equal(sample.valid, true);
    assert.deepEqual(calls.slice(2, 9), [
      `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
      'stop console',
      `terminate ${APP}`,
      `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
      'stop console',
      `terminate ${APP}`,
      `launch ${APP} css undefined ${RUN_PLAN_ARGUMENTS}`,
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
        SAMPLE,
      ],
    });
    await assert.rejects(
      takeIosSample(order(), context),
      /maximum refresh rate of 120 Hz/
    );
  });

  it('has a work check for shared-elements', async () => {
    const { context } = withSample(
      'ReanimatedBenchmark: READY scenario=shared-elements version=1 load=15 jsThread=5002',
      sampleLine(
        inAppSample({
          boundaries: [START_BOUNDARY, { ...END_BOUNDARY, mounts: 309 }],
        })
      )
    );
    const sample = await takeIosSample(
      order({ scenario: 'shared-elements' }),
      context
    );
    assert.equal(!sample.valid && sample.cause, 'work');
    assert.equal(
      !sample.valid && sample.detail,
      '299 mount batches, expected at least 300'
    );
  });

  it('is invalid for fewer UI updates than 90% of the display refreshes, for each scenario', async () => {
    const sparse = sampleLine(
      inAppSample({
        boundaries: [START_BOUNDARY, { ...END_BOUNDARY, updates: 539 }],
        updates: steadyUpdates(539),
      })
    );
    const { context } = withSample(
      'ReanimatedBenchmark: READY scenario=idle-cost version=3 load=250 jsThread=5002',
      sparse
    );
    const sample = await takeIosSample(
      order({ scenario: 'idle-cost' }),
      context
    );
    assert.equal(!sample.valid && sample.cause, 'frames');
    assert.equal(
      !sample.valid && sample.detail,
      '539 frames, expected at least 540'
    );
  });

  it('stops when the state of the device in the app changes', async () => {
    const { context } = createFake();
    await takeIosSample(order(), context);
    const changed = withSample(
      READY,
      sampleLine(
        inAppSample({
          boundaries: [START_BOUNDARY, { ...END_BOUNDARY, lowPower: true }],
        })
      )
    );
    changed.context.guard = context.guard;
    await assert.rejects(
      takeIosSample(order(), changed.context),
      /The device state changed \(read by the app\): lowPowerMode: false -> true/
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
  it('launches the app with no scenario and no plan and stops it after the LAUNCH line', async () => {
    const { context, calls } = createFake({ lines: [LAUNCHED, LAUNCH] });
    await launchOnce(context.device, APP, context.clock);
    assert.deepEqual(calls, [
      `launch ${APP} undefined undefined`,
      'stop console',
      `terminate ${APP}`,
    ]);
  });

  it('is a tool error when the app writes no LAUNCH line, and stops the console and the app first', async () => {
    for (const lines of [[LAUNCHED], [LAUNCHED, READY]]) {
      const { context, calls } = createFake({ lines, terminateErrorAt: 3 });
      await assert.rejects(
        launchOnce(context.device, APP, context.clock),
        /did not write a LAUNCH line|wrote READY but no LAUNCH line/
      );
      assert.deepEqual(calls, [
        `launch ${APP} undefined undefined`,
        'stop console',
        `terminate ${APP}`,
      ]);
    }
  });

  it('ignores a line without the report prefix', async () => {
    const { context } = createFake({
      lines: [LAUNCHED, LAUNCH.slice(REPORT_PREFIX.length)],
    });
    await assert.rejects(
      launchOnce(context.device, APP, context.clock),
      /did not write a LAUNCH line in its first launch after the install: no LAUNCH line in 60 s/
    );
  });
});
