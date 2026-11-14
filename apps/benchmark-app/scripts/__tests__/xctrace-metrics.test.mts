import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { readBoundarySignposts, readTraceEpochs } from '../xctrace-metrics.mts';
import type {
  TraceExports,
  TraceSpan,
  TracedIosApp,
} from '../xctrace-metrics.mts';

// Cuts of the exports of xctrace 27.2 (27B52) of an iPhone 13 mini with iOS
// 27.0.1. The rows overlap 1855 ms to 1908 ms, and the cells that the reader
// does not read are sentinels. The Boundary signposts are not real: the tests
// add them in the format of the real State signposts of the same export.
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'xctrace');
const SPAN: TraceSpan = { startNs: 1_856_890_916, endNs: 1_906_890_916 };
const SECONDS = 0.05;
const MAIN_RUNNING_MS = 19.773169;
const JS_RUNNING_MS = 0.113417;
const OTHER_PID = 9999;
const APP: TracedIosApp = {
  pid: 8865,
  mainThread: 3840236,
  jsThread: 3840263,
};
const EXPORTS: TraceExports = {
  threadState: fixture('thread-state-window.xml'),
  frames: fixture('hitches-updates.xml'),
  signposts: fixture('os-signpost-window.xml'),
};
const SCHEMAS: Record<keyof TraceExports, string> = {
  threadState: 'thread-state',
  frames: 'hitches-updates',
  signposts: 'os-signpost',
};

function fixture(file: string): string {
  return fs.readFileSync(path.join(FIXTURES, file), 'utf8');
}

function onlyEpoch(exports: TraceExports = EXPORTS, app = APP) {
  return readTraceEpochs(exports, app, [SPAN])[0];
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
}): string {
  const pid = row.pid ?? APP.pid;
  return `<row><start-time>${row.start}</start-time><thread><tid>${row.thread}</tid>${processCell(pid)}</thread><thread-state>${row.state}</thread-state><duration>${row.duration ?? 1}</duration>${processCell(pid)}${sentinels(11)}</row>`;
}

function intervalRow(start: number, duration: number, pid = APP.pid): string {
  return `<row><start-time>${start}</start-time><duration>${duration}</duration>${processCell(pid)}${sentinels(6)}</row>`;
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

function boundaryRow(time: number, index: number, pid = APP.pid): string {
  return signpostRow({
    time,
    name: 'Boundary',
    subsystem: 'com.reanimatedbenchmark',
    message: `<narrative-text>index=</narrative-text><uint64>${index}</uint64>`,
    pid,
  });
}

function mountRow(time: number, pid = APP.pid): string {
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

function syntheticThreadState(rows: string[]): string {
  return withRows(withoutRows(EXPORTS.threadState), rows);
}

describe('readTraceEpochs', () => {
  it('gives the CPU time for each second, the frames and the mount batches of a span of a real export', () => {
    const epoch = onlyEpoch();
    assertClose(epoch.uiThreadCpu, MAIN_RUNNING_MS / SECONDS);
    assertClose(epoch.jsThreadCpu, JS_RUNNING_MS / SECONDS);
    assertClose(epoch.processCpu, (MAIN_RUNNING_MS + JS_RUNNING_MS) / SECONDS);
    assert.equal(epoch.frameDurationsMs.length, 3);
    assertClose(
      [...epoch.frameDurationsMs].sort((left, right) => left - right)[1],
      6.464291
    );
    assert.equal(epoch.mountBatchCount, 3);
  });

  it('splits the data at the boundaries of the epochs', () => {
    const middle = (SPAN.startNs + SPAN.endNs) / 2;
    const [first, second] = readTraceEpochs(EXPORTS, APP, [
      { startNs: SPAN.startNs, endNs: middle },
      { startNs: middle, endNs: SPAN.endNs },
    ]);
    const whole = onlyEpoch();
    assertClose(
      (first.uiThreadCpu + second.uiThreadCpu) / 2,
      whole.uiThreadCpu
    );
    assert.equal(
      first.frameDurationsMs.length + second.frameDurationsMs.length,
      3
    );
    assert.equal(first.mountBatchCount + second.mountBatchCount, 3);
  });

  it('ignores the rows of another process in each table', () => {
    const epoch = onlyEpoch({
      threadState: withRows(EXPORTS.threadState, [
        threadRow({
          start: 100,
          thread: 5,
          state: 'Running',
          duration: 5e9,
          pid: OTHER_PID,
        }),
      ]),
      frames: withRows(EXPORTS.frames, [
        intervalRow(SPAN.startNs, 5e6, OTHER_PID),
      ]),
      signposts: withRows(EXPORTS.signposts, [
        mountRow(SPAN.startNs, OTHER_PID),
      ]),
    });
    assert.deepEqual(epoch, onlyEpoch());
  });

  it('cuts the Running time to the span', () => {
    const epoch = onlyEpoch({
      ...EXPORTS,
      threadState: withRows(EXPORTS.threadState, [
        threadRow({
          start: SPAN.startNs - 10_000_000,
          thread: 77,
          state: 'Running',
          duration: 20_000_000,
        }),
        threadRow({
          start: SPAN.endNs - 5_000_000,
          thread: 77,
          state: 'Running',
          duration: 25_000_000,
        }),
        threadRow({
          start: SPAN.endNs,
          thread: 77,
          state: 'Running',
          duration: 1_000_000,
        }),
      ]),
    });
    assertClose(
      epoch.processCpu,
      (MAIN_RUNNING_MS + JS_RUNNING_MS + 15) / SECONDS
    );
    assertClose(epoch.uiThreadCpu, MAIN_RUNNING_MS / SECONDS);
  });

  it('counts the frames that are fully in the span and the mount batches from its start to before its end', () => {
    const epoch = onlyEpoch({
      ...EXPORTS,
      frames: withRows(EXPORTS.frames, [
        intervalRow(SPAN.startNs - 5_000_000, 10_000_000),
        intervalRow(SPAN.startNs, 3_000_000),
        intervalRow(SPAN.endNs - 6_000_000, 6_000_000),
        intervalRow(SPAN.endNs - 6_000_000, 10_000_000),
      ]),
      signposts: withRows(EXPORTS.signposts, [
        mountRow(SPAN.startNs - 1),
        mountRow(SPAN.startNs),
        mountRow(SPAN.endNs - 1),
        mountRow(SPAN.endNs),
      ]),
    });
    assert.equal(epoch.frameDurationsMs.length, 5);
    assert.equal(epoch.mountBatchCount, 5);
  });

  it('stops when the scheduler data of the main thread or the JS thread does not cover a span', () => {
    for (const thread of [APP.mainThread, APP.jsThread]) {
      const other = thread === APP.mainThread ? APP.jsThread : APP.mainThread;
      const threadState = syntheticThreadState([
        threadRow({
          start: 1_800_000_000,
          thread: other,
          state: 'Blocked',
          duration: 1_100_000_000,
        }),
        threadRow({
          start: 1_800_000_000,
          thread,
          state: 'Blocked',
          duration: 80_000_000,
        }),
        threadRow({
          start: 1_880_000_000,
          thread,
          state: 'Unknown',
          duration: 10_000_000,
        }),
        threadRow({
          start: 1_890_000_000,
          thread,
          state: 'Blocked',
          duration: 1_010_000_000,
        }),
      ]);
      assert.throws(() => onlyEpoch({ ...EXPORTS, threadState }), {
        message: `The scheduler data does not cover epoch 0 (1856890916 ns to 1906890916 ns) for both the main thread ${APP.mainThread} and the JS thread ${APP.jsThread}`,
      });
    }
  });

  it('does not use a row that starts at the trace start as scheduler data', () => {
    const threadState = syntheticThreadState([
      threadRow({
        start: 0,
        thread: APP.mainThread,
        state: 'Blocked',
        duration: 3e9,
      }),
      threadRow({
        start: 1_800_000_000,
        thread: APP.jsThread,
        state: 'Blocked',
        duration: 1e9,
      }),
    ]);
    assert.throws(
      () => onlyEpoch({ ...EXPORTS, threadState }),
      /The scheduler data does not cover epoch 0/
    );
  });

  it('stops when the main thread or the JS thread has no row', () => {
    assert.throws(
      () => onlyEpoch(EXPORTS, { ...APP, mainThread: 42 }),
      /The trace has no row of the main thread 42 of process 8865/
    );
    assert.throws(
      () => onlyEpoch(EXPORTS, { ...APP, jsThread: 43 }),
      /The trace has no row of the JS thread 43 of process 8865/
    );
  });

  it('stops on an unknown thread state, a duration that is not positive, a row without a thread id or a missing column', () => {
    for (const [threadState, problem] of [
      [
        withRows(EXPORTS.threadState, [
          threadRow({ start: 2e9, thread: 77, state: 'Sleeping' }),
        ]),
        /the unknown thread state "Sleeping" \(known: Running, Runnable, Preempted, Throttled, Interrupted, Blocked, Idle, Terminated, Unknown\)/,
      ],
      [
        withRows(EXPORTS.threadState, [
          threadRow({ start: 2e9, thread: 77, state: 'Running', duration: 0 }),
        ]),
        /has the duration 0 ns, expected more than 0/,
      ],
      [
        withRows(EXPORTS.threadState, [
          threadRow({ start: 2e9, thread: 77, state: 'Running' }).replace(
            '<tid>77</tid>',
            ''
          ),
        ]),
        /A row of the table thread-state has no thread id/,
      ],
      [
        EXPORTS.threadState.replace(
          '<mnemonic>process</mnemonic>',
          '<mnemonic>owner</mnemonic>'
        ),
        /The table thread-state has no column process$/,
      ],
    ] as const) {
      assert.throws(() => onlyEpoch({ ...EXPORTS, threadState }), problem);
    }
  });

  it('stops when an export has no table with the needed schema', () => {
    const withoutSchema =
      '<?xml version="1.0"?>\n<trace-query-result>\n<node xpath=\'//x\'></node>\n</trace-query-result>\n';
    for (const [key, schema] of Object.entries(SCHEMAS)) {
      assert.throws(
        () => onlyEpoch({ ...EXPORTS, [key]: withoutSchema }),
        new RegExp(`The xctrace export has no table ${schema}$`)
      );
    }
  });

  it('stops on a time or a duration cell without an integer', () => {
    assert.throws(
      () =>
        onlyEpoch({
          ...EXPORTS,
          frames: withRows(EXPORTS.frames, [
            intervalRow(2e9, 0).replace(
              '<duration>0</duration>',
              '<sentinel/>'
            ),
          ]),
        }),
      /A row of the table hitches-updates has no integer in the cell duration/
    );
  });
});

describe('readBoundarySignposts', () => {
  it('gives the time of each Boundary signpost of the app in the order of its index', () => {
    const signposts = withRows(EXPORTS.signposts, [
      boundaryRow(1_906_000_000, 1),
      boundaryRow(1_856_000_000, 0),
      boundaryRow(1_850_000_000, 0, OTHER_PID),
      signpostRow({
        time: 1_860_000_000,
        name: 'Other',
        subsystem: 'com.reanimatedbenchmark',
        message: '<narrative-text>index=</narrative-text><uint64>5</uint64>',
      }),
    ]);
    assert.deepEqual(
      readBoundarySignposts({ signposts }, APP.pid),
      [1_856_000_000, 1_906_000_000]
    );
    assert.deepEqual(readBoundarySignposts(EXPORTS, APP.pid), []);
  });

  it('stops on a repeated index, a missing index or a message without an index', () => {
    for (const [rows, problem] of [
      [
        [boundaryRow(1, 0), boundaryRow(2, 0)],
        /The Boundary signpost "index=0" has no new index/,
      ],
      [
        [boundaryRow(1, 0), boundaryRow(2, 2)],
        /do not have the indexes 0 to 1/,
      ],
      [
        [
          signpostRow({
            time: 1,
            name: 'Boundary',
            subsystem: 'com.reanimatedbenchmark',
            message: '<narrative-text>start</narrative-text>',
          }),
        ],
        /The Boundary signpost "start" has no new index/,
      ],
    ] as const) {
      assert.throws(
        () =>
          readBoundarySignposts(
            { signposts: withRows(EXPORTS.signposts, [...rows]) },
            APP.pid
          ),
        problem
      );
    }
  });
});
