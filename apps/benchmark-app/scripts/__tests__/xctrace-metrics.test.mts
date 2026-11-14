import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import zlib from 'node:zlib';

import { computeIosTraceMetrics } from '../xctrace-metrics.mts';
import type {
  IosTraceReading,
  TraceExports,
  TracedIosApp,
} from '../xctrace-metrics.mts';

const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'xctrace');
const EXPORTS: TraceExports = {
  threadState: fixture('window-thread-state.xml.gz'),
  frames: fixture('hitches-updates.xml'),
  hitches: fixture('hitches.xml'),
  thermal: fixture('device-thermal-state-intervals.xml'),
  signposts: fixture('window-os-signpost.xml.gz'),
};
const SCHEMAS: Record<keyof TraceExports, string> = {
  threadState: 'thread-state',
  frames: 'hitches-updates',
  hitches: 'hitches',
  thermal: 'device-thermal-state-intervals',
  signposts: 'os-signpost',
};
const APP: TracedIosApp = {
  pid: 8865,
  mainThread: 3840236,
  jsThread: 3840263,
  refreshRate: 60,
};
const WINDOW_START = 1_856_890_916;
const WINDOW_END = 2_856_859_583;
const SECONDS = 0.999968667;
const OTHER_PID = 9999;
const NOMINAL_STATE = {
  footprint: 40993,
  thermal: 0,
  batteryLevel: 100,
  batteryState: 3,
  lowPower: 0,
  brightness: 0,
};
const FULL_BATTERY = {
  batteryLevel: 100,
  batteryState: 'full',
  lowPowerMode: false,
  brightness: 0,
};

function fixture(file: string): string {
  const content = fs.readFileSync(path.join(FIXTURES, file));
  return (file.endsWith('.gz') ? zlib.gunzipSync(content) : content).toString(
    'utf8'
  );
}

function livedReading(reading: IosTraceReading) {
  assert.equal(reading.processLived, true);
  return reading.processLived ? reading : assert.fail();
}

function metricsOf(exports: TraceExports, app = APP) {
  return livedReading(computeIosTraceMetrics(exports, app)).metrics;
}

function assertClose(actual: number | null, expected: number) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) < 1e-6,
    `${actual} is not ${expected}`
  );
}

function withRows(xml: string, rows: string[]): string {
  return xml.replace('</node>', `${rows.join('\n')}\n</node>`);
}

function withoutRows(xml: string): string {
  return xml.replace(/<row>[\s\S]*<\/row>\n/, '');
}

function sentinels(count: number): string {
  return '<sentinel/>'.repeat(count);
}

function processCell(pid: number): string {
  return `<process><pid>${pid}</pid></process>`;
}

function threadRow(row: {
  start: number;
  thread: number;
  state: string;
  duration?: number;
  pid?: number;
  core?: string;
}): string {
  const pid = row.pid ?? APP.pid;
  const core = row.core ? `<core fmt="${row.core}">0</core>` : sentinels(1);
  return `<row><start-time>${row.start}</start-time><thread><tid>${row.thread}</tid>${processCell(pid)}</thread><thread-state>${row.state}</thread-state><duration>${row.duration ?? 1}</duration>${processCell(pid)}${core}${sentinels(10)}</row>`;
}

function intervalRow(start: number, duration: number, pid = APP.pid): string {
  return `<row><start-time>${start}</start-time><duration>${duration}</duration>${processCell(pid)}${sentinels(6)}</row>`;
}

function hitchRow(start: number, duration: number, pid = APP.pid): string {
  return `<row><start-time>${start}</start-time><duration>${duration}</duration>${processCell(pid)}${sentinels(5)}</row>`;
}

function signpostRow(row: {
  time: number;
  name: string;
  subsystem: string;
  message: string;
  eventType?: string;
  pid?: number;
}): string {
  return `<row><event-time>${row.time}</event-time>${sentinels(1)}${processCell(row.pid ?? APP.pid)}<event-type>${row.eventType ?? 'Event'}</event-type>${sentinels(2)}<signpost-name>${row.name}</signpost-name>${sentinels(2)}<subsystem>${row.subsystem}</subsystem>${sentinels(1)}<os-log-metadata>${row.message}</os-log-metadata>${sentinels(1)}</row>`;
}

function stateRow(
  time: number,
  values: Record<string, number | string>,
  pid = APP.pid
): string {
  const message = Object.entries(values)
    .map(
      ([key, value], i) =>
        `<narrative-text>${i > 0 ? ' ' : ''}${key}=</narrative-text><uint64>${value}</uint64>`
    )
    .join('');
  return signpostRow({
    time,
    name: 'State',
    subsystem: 'com.reanimatedbenchmark',
    message,
    pid,
  });
}

function mountRow(time: number, pid: number): string {
  return signpostRow({
    time,
    name: 'Systrace',
    subsystem: 'dev.reactnative.instruments',
    eventType: 'Begin',
    message:
      '<string>RCTPerformMountInstructions</string><narrative-text> begin: </narrative-text>',
    pid,
  });
}

function thermalRow(start: number, duration: number, state: string): string {
  return `<row><start-time>${start}</start-time><duration>${duration}</duration><start-time>${start + duration}</start-time><thermal-state>${state}</thermal-state>${sentinels(3)}</row>`;
}

function syntheticThreadState(rows: string[]): string {
  return withRows(withoutRows(EXPORTS.threadState), rows);
}

describe('computeIosTraceMetrics', () => {
  it('computes all metrics from a cut of a real trace', () => {
    const reading = livedReading(computeIosTraceMetrics(EXPORTS, APP));
    const { metrics } = reading;
    assertClose(metrics.expectedFrameCount, 60 * SECONDS);
    assert.equal(metrics.frameCount, 59);
    assertClose(metrics.jankyFrames, 1 - 59 / (60 * SECONDS));
    assertClose(metrics.frameDurationMedian, 5.951958);
    assertClose(metrics.frameDurationP90, 6.5869244);
    assertClose(metrics.frameDurationP95, 6.6817375);
    assertClose(metrics.frameDurationP99, 7.32751972);
    assertClose(metrics.uiThreadCpu, 364.182822 / SECONDS);
    assertClose(metrics.jsThreadCpu, 2.373586 / SECONDS);
    assertClose(metrics.otherThreadsCpu, 0.31025 / SECONDS);
    assertClose(metrics.processCpu, 366.866658 / SECONDS);
    assertClose(metrics.uiThreadEfficiencyCoreShare, 243.065536 / 364.182822);
    assert.equal(metrics.hitchCount, 1);
    assertClose(metrics.hitchTime, 16.670583 / SECONDS);
    assert.equal(metrics.mountBatchCount, 60);
    assert.equal(metrics.memory, 41393);
    assert.equal(metrics.windowMemoryDelta, 400);
    assert.equal(reading.thermalState, 0);
    assert.deepEqual(reading.appStates, [FULL_BATTERY, FULL_BATTERY]);
  });

  it('ignores the rows of another process in each table', () => {
    const reading = computeIosTraceMetrics(
      {
        threadState: withRows(EXPORTS.threadState, [
          threadRow({
            start: 100,
            thread: 5,
            state: 'Running',
            duration: 5e9,
            pid: OTHER_PID,
          }),
          threadRow({
            start: 9e9,
            thread: 5,
            state: 'Blocked',
            pid: OTHER_PID,
          }),
          threadRow({
            start: 2e9,
            thread: APP.mainThread,
            state: 'Terminated',
            pid: OTHER_PID,
          }),
        ]),
        frames: withRows(EXPORTS.frames, [intervalRow(2e9, 50e6, OTHER_PID)]),
        hitches: withRows(EXPORTS.hitches, [hitchRow(2e9, 50e6, OTHER_PID)]),
        thermal: EXPORTS.thermal,
        signposts: withRows(EXPORTS.signposts, [
          stateRow(
            2e9,
            { ...NOMINAL_STATE, footprint: 99999, thermal: 3 },
            OTHER_PID
          ),
          stateRow(5e9, NOMINAL_STATE, OTHER_PID),
          mountRow(2e9, OTHER_PID),
        ]),
      },
      APP
    );
    assert.deepEqual(reading, computeIosTraceMetrics(EXPORTS, APP));
  });

  it('cuts the Running time to the window', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      threadState: withRows(EXPORTS.threadState, [
        threadRow({
          start: 1_800_000_000,
          thread: 77,
          state: 'Running',
          duration: 100_000_000,
        }),
        threadRow({
          start: 1_900_000_000,
          thread: 77,
          state: 'Blocked',
          duration: 500_000_000,
        }),
        threadRow({
          start: 2_800_000_000,
          thread: 77,
          state: 'Running',
          duration: 1e9,
        }),
        threadRow({
          start: WINDOW_END,
          thread: 77,
          state: 'Running',
          duration: 1e6,
        }),
      ]),
    });
    assertClose(metrics.expectedFrameCount, 60 * SECONDS);
    assertClose(metrics.otherThreadsCpu, (0.31025 + 99.968667) / SECONDS);
    assertClose(metrics.processCpu, (366.866658 + 99.968667) / SECONDS);
    assertClose(metrics.uiThreadCpu, 364.182822 / SECONDS);
  });

  it('gives the share of the main thread Running time on efficiency cores', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      threadState: syntheticThreadState([
        threadRow({
          start: 1_800_000_000,
          thread: APP.mainThread,
          state: 'Blocked',
        }),
        threadRow({
          start: 1_900_000_000,
          thread: APP.mainThread,
          state: 'Running',
          duration: 3e6,
          core: 'CPU 0 (E Core)',
        }),
        threadRow({
          start: 2_000_000_000,
          thread: APP.mainThread,
          state: 'Running',
          duration: 1e6,
          core: 'CPU 4 (S Core)',
        }),
        threadRow({
          start: 2_100_000_000,
          thread: APP.mainThread,
          state: 'Interrupted',
          duration: 9e6,
          core: 'CPU 0 (E Core)',
        }),
        threadRow({
          start: 2_950_000_000,
          thread: APP.jsThread,
          state: 'Blocked',
        }),
      ]),
    });
    assertClose(metrics.uiThreadCpu, 4 / SECONDS);
    assert.equal(metrics.jsThreadCpu, 0);
    assert.equal(metrics.otherThreadsCpu, 0);
    assertClose(metrics.uiThreadEfficiencyCoreShare, 0.75);
  });

  it('gives a null efficiency core share when the main thread does not run in the window', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      threadState: syntheticThreadState([
        threadRow({
          start: 1_800_000_000,
          thread: APP.mainThread,
          state: 'Blocked',
        }),
        threadRow({
          start: 2_950_000_000,
          thread: APP.jsThread,
          state: 'Running',
          duration: 1e9,
        }),
      ]),
    });
    assert.equal(metrics.uiThreadCpu, 0);
    assert.equal(metrics.uiThreadEfficiencyCoreShare, null);
  });

  it('counts only the frames that are fully in the window', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      frames: withRows(EXPORTS.frames, [
        intervalRow(1_850_000_000, 10_000_000),
        intervalRow(WINDOW_START, 3_000_000),
        intervalRow(2_850_000_000, 6_859_583),
        intervalRow(2_850_000_000, 10_000_000),
      ]),
    });
    assert.equal(metrics.frameCount, 61);
  });

  it('gives 0 frames and null frame durations when the app has no frame in the window', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      frames: withRows(withoutRows(EXPORTS.frames), [intervalRow(1e9, 5e6)]),
    });
    assert.equal(metrics.frameCount, 0);
    assert.equal(metrics.jankyFrames, 1);
    assert.equal(metrics.frameDurationMedian, null);
    assert.equal(metrics.frameDurationP90, null);
    assert.equal(metrics.frameDurationP95, null);
    assert.equal(metrics.frameDurationP99, null);
  });

  it('gives 0 janky frames when the app draws more frames than the refresh rate gives', () => {
    const metrics = metricsOf(EXPORTS, { ...APP, refreshRate: 30 });
    assertClose(metrics.expectedFrameCount, 30 * SECONDS);
    assert.equal(metrics.jankyFrames, 0);
  });

  it('counts the hitches that overlap the window with their time in the window', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      hitches: withRows(EXPORTS.hitches, [
        hitchRow(1_850_000_000, 20_000_000),
        hitchRow(2_850_000_000, 20_000_000),
        hitchRow(1_836_890_916, 20_000_000),
        hitchRow(WINDOW_END, 5_000_000),
      ]),
    });
    assert.equal(metrics.hitchCount, 3);
    assertClose(metrics.hitchTime, 36.63925 / SECONDS);
  });

  it('counts the mount batches from the window start to before the window end', () => {
    const metrics = metricsOf({
      ...EXPORTS,
      signposts: withRows(EXPORTS.signposts, [
        mountRow(WINDOW_START - 1, APP.pid),
        mountRow(WINDOW_START, APP.pid),
        mountRow(WINDOW_END - 1, APP.pid),
        mountRow(WINDOW_END, APP.pid),
      ]),
    });
    assert.equal(metrics.mountBatchCount, 62);
  });

  it('takes the window and the memory from the first and the last State event and an app state from each State event', () => {
    const reading = livedReading(
      computeIosTraceMetrics(
        {
          ...EXPORTS,
          signposts: withRows(EXPORTS.signposts, [
            stateRow(2_900_000_000, { ...NOMINAL_STATE, footprint: 42000 }),
            stateRow(2_400_000_000, {
              ...NOMINAL_STATE,
              footprint: 41000,
              batteryState: 2,
            }),
            stateRow(1_500_000_000, {
              footprint: 40000,
              thermal: 0,
              batteryLevel: 99,
              batteryState: 1,
              lowPower: 1,
              brightness: 50,
            }),
          ]),
        },
        APP
      )
    );
    assertClose(reading.metrics.expectedFrameCount, 84);
    assert.equal(reading.metrics.memory, 42000);
    assert.equal(reading.metrics.windowMemoryDelta, 2000);
    assert.deepEqual(reading.appStates, [
      {
        batteryLevel: 99,
        batteryState: 'unplugged',
        lowPowerMode: true,
        brightness: 50,
      },
      FULL_BATTERY,
      { ...FULL_BATTERY, batteryState: 'charging' },
      FULL_BATTERY,
      FULL_BATTERY,
    ]);
  });

  it('gives the highest thermal state of the intervals that overlap the window', () => {
    const serious = computeIosTraceMetrics(
      {
        ...EXPORTS,
        thermal: EXPORTS.thermal.replace(
          '>Nominal</thermal-state>',
          '>Serious</thermal-state>'
        ),
      },
      APP
    );
    assert.equal(livedReading(serious).thermalState, 2);
    const outside = computeIosTraceMetrics(
      {
        ...EXPORTS,
        thermal: withRows(EXPORTS.thermal, [
          thermalRow(3e9, 1e9, 'Critical'),
          thermalRow(1_000_000_000, 700_000_000, 'Fair'),
        ]),
      },
      APP
    );
    assert.equal(livedReading(outside).thermalState, 0);
    const touching = computeIosTraceMetrics(
      {
        ...EXPORTS,
        thermal: withRows(EXPORTS.thermal, [
          thermalRow(WINDOW_END, 1e9, 'Fair'),
        ]),
      },
      APP
    );
    assert.equal(livedReading(touching).thermalState, 1);
  });

  it('gives the thermal state of a State event when it is higher', () => {
    const reading = computeIosTraceMetrics(
      {
        ...EXPORTS,
        signposts: withRows(EXPORTS.signposts, [
          stateRow(2_000_000_000, { ...NOMINAL_STATE, thermal: 2 }),
        ]),
      },
      APP
    );
    assert.equal(livedReading(reading).thermalState, 2);
  });

  it('gives a crash when the main thread terminated', () => {
    const exports = {
      ...EXPORTS,
      threadState: withRows(EXPORTS.threadState, [
        threadRow({ start: 2e9, thread: APP.mainThread, state: 'Terminated' }),
      ]),
      signposts: withoutRows(EXPORTS.signposts),
    };
    assert.deepEqual(computeIosTraceMetrics(exports, APP), {
      processLived: false,
      detail: 'the app process 8865 ended before the end of the trace',
    });
  });

  it('stops when the trace has no thread of the app process', () => {
    assert.throws(
      () => computeIosTraceMetrics(EXPORTS, { ...APP, pid: 1234 }),
      /The trace has no thread of process 1234/
    );
  });

  it('stops when the trace has fewer than 2 State events of the app', () => {
    const otherSubsystem = stateRow(2_600_000_000, NOMINAL_STATE).replace(
      '>com.reanimatedbenchmark</subsystem>',
      '>com.other</subsystem>'
    );
    for (const [rows, count] of [
      [[], 0],
      [
        [
          stateRow(2e9, NOMINAL_STATE),
          stateRow(2_500_000_000, NOMINAL_STATE, OTHER_PID),
          otherSubsystem,
        ],
        1,
      ],
    ] as const) {
      const signposts = withRows(withoutRows(EXPORTS.signposts), [...rows]);
      assert.throws(
        () => computeIosTraceMetrics({ ...EXPORTS, signposts }, APP),
        {
          message: `The trace has ${count} State signposts of the app, the trace window needs 2`,
        }
      );
    }
  });

  it('stops when the trace window is empty', () => {
    const signposts = withRows(withoutRows(EXPORTS.signposts), [
      stateRow(2e9, NOMINAL_STATE),
      stateRow(2e9, NOMINAL_STATE),
    ]);
    assert.throws(
      () => computeIosTraceMetrics({ ...EXPORTS, signposts }, APP),
      /The trace window of process 8865 is 0 ns long, expected more than 0/
    );
  });

  it('stops when the scheduler data does not cover the trace window', () => {
    for (const [rows, coverage] of [
      [
        [
          threadRow({
            start: 0,
            thread: APP.mainThread,
            state: 'Blocked',
            duration: 3e9,
          }),
          threadRow({
            start: 1_900_000_000,
            thread: APP.jsThread,
            state: 'Blocked',
            duration: 1_100_000_000,
          }),
        ],
        '1900000000 ns to 3000000000 ns',
      ],
      [
        [
          threadRow({
            start: 1_800_000_000,
            thread: APP.mainThread,
            state: 'Blocked',
            duration: 1e9,
          }),
          threadRow({
            start: 1_850_000_000,
            thread: APP.jsThread,
            state: 'Blocked',
            duration: 900_000_000,
          }),
        ],
        '1800000000 ns to 2800000000 ns',
      ],
      [
        [
          threadRow({
            start: 0,
            thread: APP.mainThread,
            state: 'Blocked',
            duration: 3e9,
          }),
          threadRow({
            start: 0,
            thread: APP.jsThread,
            state: 'Blocked',
            duration: 3e9,
          }),
        ],
        'Infinity ns to 3000000000 ns',
      ],
    ] as const) {
      assert.throws(
        () =>
          computeIosTraceMetrics(
            { ...EXPORTS, threadState: syntheticThreadState([...rows]) },
            APP
          ),
        {
          message: `The scheduler data of the trace (${coverage}) does not cover the trace window (1856890916 ns to 2856859583 ns)`,
        }
      );
    }
  });

  it('stops when the main thread or the JS thread has no row', () => {
    assert.throws(
      () => computeIosTraceMetrics(EXPORTS, { ...APP, mainThread: 42 }),
      /The trace has no row of the main thread 42 of process 8865/
    );
    assert.throws(
      () => computeIosTraceMetrics(EXPORTS, { ...APP, jsThread: 43 }),
      /The trace has no row of the JS thread 43 of process 8865/
    );
  });

  it('stops when an export has no table with the needed schema', () => {
    const withoutSchema =
      '<?xml version="1.0"?>\n<trace-query-result>\n<node xpath=\'//x\'></node>\n</trace-query-result>\n';
    for (const [key, schema] of Object.entries(SCHEMAS)) {
      assert.throws(
        () => computeIosTraceMetrics({ ...EXPORTS, [key]: withoutSchema }, APP),
        new RegExp(`The xctrace export has no table ${schema}$`)
      );
    }
    assert.throws(
      () =>
        computeIosTraceMetrics({ ...EXPORTS, frames: EXPORTS.hitches }, APP),
      /no table hitches-updates/
    );
  });

  it('stops on a State event without a key or with a value that is not an integer', () => {
    const { brightness: _, ...withoutBrightness } = NOMINAL_STATE;
    for (const [values, problem] of [
      [withoutBrightness, /no integer value of brightness/],
      [
        { ...NOMINAL_STATE, footprint: '1.5' },
        /"footprint=1.5 thermal=0 .*" has no integer value of footprint/,
      ],
      [{ ...NOMINAL_STATE, lowPower: '' }, /no integer value of lowPower/],
    ] as const) {
      assert.throws(
        () =>
          computeIosTraceMetrics(
            {
              ...EXPORTS,
              signposts: withRows(EXPORTS.signposts, [stateRow(2e9, values)]),
            },
            APP
          ),
        problem
      );
    }
  });

  it('stops on a State event with an unknown battery state', () => {
    assert.throws(
      () =>
        computeIosTraceMetrics(
          {
            ...EXPORTS,
            signposts: withRows(EXPORTS.signposts, [
              stateRow(2_400_000_000, { ...NOMINAL_STATE, batteryState: 7 }),
            ]),
          },
          APP
        ),
      /The State signpost has the unknown batteryState 7/
    );
  });

  it('stops on an unknown thermal state of an interval in the window', () => {
    const thermal = EXPORTS.thermal.replace(
      '>Nominal</thermal-state>',
      '>Hot</thermal-state>'
    );
    assert.throws(
      () => computeIosTraceMetrics({ ...EXPORTS, thermal }, APP),
      /The thermal state "Hot" is not one of Nominal, Fair, Serious, Critical/
    );
  });

  it('stops on a time or a duration cell without an integer', () => {
    assert.throws(
      () =>
        computeIosTraceMetrics(
          {
            ...EXPORTS,
            frames: withRows(EXPORTS.frames, [
              intervalRow(2e9, 0).replace(
                '<duration>0</duration>',
                '<sentinel/>'
              ),
            ]),
          },
          APP
        ),
      /A row of the table hitches-updates has no integer in the cell duration/
    );
  });

  it('stops when a metric is not a finite number', () => {
    assert.throws(
      () =>
        computeIosTraceMetrics(EXPORTS, { ...APP, refreshRate: Number.NaN }),
      /not finite numbers: jankyFrames = NaN, expectedFrameCount = NaN/
    );
  });
});
