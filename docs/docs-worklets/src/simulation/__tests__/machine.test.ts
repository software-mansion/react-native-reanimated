import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { formatLogs, formatTrace } from '../format';
import { simulate } from '../index';
import { loadSnippet } from '../loadSnippet';
import { Machine } from '../machine';
import type { SimEvent, SimulateOptions, Snapshot } from '../types';
import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  runOnRuntimeSync,
  scheduleOnUI,
  sendToUIThread,
  updateScreen,
} from '../worklets';
import * as syncShareable from '../../../docs/tutorials/_synchronizing-data/syncShareable';
import * as syncSynchronizable from '../../../docs/tutorials/_synchronizing-data/syncSynchronizable';
import { asModule, snippetPath, snippetSource, unindent } from './helpers';

function runSnippet(name: string, options?: SimulateOptions): Snapshot[] {
  const path = snippetPath(name);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return simulate(require(path), readFileSync(path, 'utf8'), options);
}

function eventsOfType<Type extends SimEvent['type']>(
  snapshots: Snapshot[],
  type: Type
): Extract<SimEvent, { type: Type }>[] {
  return snapshots.flatMap(
    (snapshot) =>
      snapshot.events.filter((event) => event.type === type) as Extract<
        SimEvent,
        { type: Type }
      >[]
  );
}

function core(snapshot: Snapshot, id: string) {
  return snapshot.cores.find((candidate) => candidate.id === id)!;
}

describe('Machine with the docs snippets', () => {
  it('runs scheduleOnUI.js: RN and UI execute at the same time', () => {
    const snapshots = runSnippet('scheduleOnUI');
    assert.deepEqual(formatTrace(snapshots), [
      't1  UI:-    RN:L20  | schedule(rn→ui) compute() via cross-runtime',
      't2  UI:L9   RN:L21  | log(ui) "computing on UI"; schedule(rn→rn) continueOnRN() via same-runtime',
      't3  UI:L10  RN:L22  | log(ui) "still computing on UI"; log(rn) "RN continues"',
      't4  UI:L11  RN:L15  | schedule(ui→rn) onDone(42) via cross-runtime; log(rn) "RN keeps working"',
      't5  UI:-    RN:L16  | log(rn) "while UI computes"',
      't6  UI:-    RN:L4   | log(rn) "RN got 42"',
    ]);
    assert.equal(snapshots.length, 7);
    assert.equal(snapshots[0].tick, 0);
    assert.deepEqual(core(snapshots[1], 'ui').queue, ['compute()']);
    assert.deepEqual(core(snapshots[2], 'rn').queue, ['continueOnRN()']);
    assert.equal(core(snapshots[2], 'ui').status, 'running');
    assert.deepEqual(core(snapshots[4], 'rn').queue, ['onDone(42)']);
    assert.equal(snapshots[6].finished, true);
    assert.equal(snapshots[5].finished, false);
    assert.deepEqual(formatLogs(snapshots), [
      '[ui] computing on UI',
      '[ui] still computing on UI',
      '[rn] RN continues',
      '[rn] RN keeps working',
      '[rn] while UI computes',
      '[rn] RN got 42',
    ]);
  });

  it('runs twoJobs.js: two scheduleOnUI calls run on UI in order, right away', () => {
    const snapshots = runSnippet('twoJobs');
    assert.deepEqual(formatTrace(snapshots), [
      't1  UI:-    RN:L12  | schedule(rn→ui) first() via cross-runtime',
      't2  UI:L4   RN:L13  | log(ui) "first"; log(rn) "between"',
      't3  UI:-    RN:L14  | schedule(rn→ui) second() via cross-runtime',
      't4  UI:L8   RN:L15  | log(ui) "second"; log(rn) "done"',
    ]);
    assert.deepEqual(core(snapshots[1], 'ui').queue, ['first()']);
    assert.deepEqual(core(snapshots[3], 'ui').queue, ['second()']);
  });

  it('runs runtimeKinds.js: the same worklet runs on RN, UI and a worker at once', () => {
    const snapshots = runSnippet('runtimeKinds');
    const trace = formatTrace(snapshots);
    assert.equal(
      trace[0],
      't1  UI:-    RN:L20  BACKGROUND:-    | create(rn) runtime "background" as worker:background'
    );
    assert.equal(
      trace[4],
      't5  UI:L16  RN:L14  BACKGROUND:L15  | schedule(ui→rn) report("the UI finished with 2") via cross-runtime; log(rn) "working on RN"; log(worker:background) "still working on the worker"'
    );
    assert.equal(snapshots[0].cores.length, 2);
    assert.equal(snapshots[1].cores.length, 2);
    assert.equal(snapshots[2].cores.length, 3);
    assert.equal(core(snapshots[2], 'worker:background').kind, 'worker');
    assert.deepEqual(core(snapshots[2], 'ui').queue, ['work("the UI", 1)']);
    assert.deepEqual(core(snapshots[4], 'rn').callStack, ['main', 'work']);
    for (const tick of [4, 5]) {
      assert.ok(
        snapshots[tick].cores.every(
          (candidate) => candidate.status === 'running'
        ),
        `all cores run at t${tick}`
      );
    }
    assert.equal(snapshots[snapshots.length - 1].tick, 10);
    assert.deepEqual(formatLogs(snapshots).slice(-3), [
      '[rn] the UI finished with 2',
      '[rn] the worker finished with 42',
      '[rn] RN finished with 10',
    ]);
  });

  it('runs reactNativeModel.jsx: the interval counts to 9, the UI thread redraws each time', () => {
    const snapshots = runSnippet('reactNativeModel', { uiRuntime: false });
    const counter = (snapshot: Snapshot) =>
      JSON.stringify(snapshot.screen.tree ?? null).match(
        /"Text","props":\{\},"children":\["(\d)"\]/
      )?.[1];
    assert.equal(counter(snapshots[4]), '0');
    assert.equal(counter(snapshots[8]), '1');
    assert.equal(counter(snapshots[snapshots.length - 1]), '9');
    assert.deepEqual(
      snapshots.slice(1, 5).map((snapshot) => core(snapshot, 'rn').line),
      [19, 21, 26, 34]
    );
    const redraws = snapshots.filter((snapshot) =>
      snapshot.events.some((event) => event.type === 'screen')
    );
    assert.equal(redraws.length, 10);
    assert.ok(
      redraws
        .slice(0, 9)
        .every((snapshot) => core(snapshot, 'rn').status === 'running')
    );
  });

  it('runs busyJsThread.jsx: the touch waits for the busy JS thread', () => {
    const snapshots = runSnippet('busyJsThread', {
      uiRuntime: false,
      skipTicks: 3,
    });
    const touchedFrom = snapshots.findIndex(
      (snapshot) => snapshot.screen.touch === 'Refresh'
    );
    const handled = snapshots.findIndex((snapshot) =>
      snapshot.events.some(
        (event) =>
          event.type === 'jobStart' && event.job.startsWith('dispatchPress')
      )
    );
    assert.equal(touchedFrom, 2);
    assert.equal(handled, 12);
    assert.ok(snapshots[0].screen.tree !== undefined);
    assert.ok(
      snapshots
        .slice(1, 12)
        .every((snapshot) => core(snapshot, 'rn').line === 37)
    );
  });

  it('runs handlerOnUIRuntime.jsx: the JS thread acquires the UI Runtime', () => {
    const snapshots = runSnippet('handlerOnUIRuntime', { skipTicks: 3 });
    const acquired = snapshots.find(
      (snapshot) => core(snapshot, 'rn').runtime === 'ui'
    );
    assert.ok(acquired !== undefined);
    assert.equal(core(acquired!, 'rn').line, 32);
    const nativeProps = snapshots[snapshots.length - 1].screen
      .nativeProps as Record<string, unknown>;
    assert.deepEqual(nativeProps.status, { text: 'refreshing' });
  });

  it('runs handlerOnUIThread.jsx: the UI Runtime handles the touch on the UI thread', () => {
    const snapshots = runSnippet('handlerOnUIThread', { skipTicks: 3 });
    const handled = snapshots.find(
      (snapshot) => core(snapshot, 'ui').line === 30
    );
    assert.ok(handled !== undefined);
    assert.equal(core(handled!, 'ui').runtime, 'ui');
    const nativeProps = handled!.screen.nativeProps as Record<
      string,
      { text: string }
    >;
    assert.equal(nativeProps.status.text, 'refreshing');
  });

  it('rejects sendToUIThread with a JavaScript function', () => {
    function* draw() {
      yield updateScreen({ x: 1 });
    }
    function* main() {
      yield sendToUIThread(draw);
    }
    const source = unindent(`
      export function* draw() {
        yield updateScreen({ x: 1 });
      }
      export default function* main() {
        yield sendToUIThread(draw);
      }
    `);
    const snapshots = simulate(asModule({ default: main, draw }), source);
    assert.match(
      eventsOfType(snapshots, 'error')[0].message,
      /expects a native function/
    );
  });

  it('runs microtask.js: scheduleOnRN from RN runs after the current job on RN', () => {
    const snapshots = runSnippet('microtask');
    assert.deepEqual(formatTrace(snapshots), [
      't1  UI:-    RN:L8   | schedule(rn→rn) later() via same-runtime',
      't2  UI:-    RN:L9   | log(rn) "sync"',
      't3  UI:-    RN:L4   | log(rn) "later"',
    ]);
    assert.ok(
      snapshots.every((snapshot) => core(snapshot, 'ui').status === 'idle')
    );
  });
});

describe('Machine semantics', () => {
  it('scheduleOnRN on RN runs after the current job and before delivered jobs', () => {
    function* a() {
      yield console.log('a');
    }
    function* back() {
      yield console.log('back');
    }
    function* onUI() {
      yield scheduleOnRN(back);
    }
    function* main() {
      yield scheduleOnUI(onUI);
      yield scheduleOnRN(a);
      yield console.log('main');
    }
    const snapshots = simulate(
      asModule({ default: main, a, back, onUI }),
      unindent(`
        export function* a() {
          yield console.log('a');
        }
        export function* back() {
          yield console.log('back');
        }
        export function* onUI() {
          yield scheduleOnRN(back);
        }
        export default function* main() {
          yield scheduleOnUI(onUI);
          yield scheduleOnRN(a);
          yield console.log('main');
        }
      `)
    );
    assert.deepEqual(core(snapshots[2], 'rn').queue, ['a()', 'back()']);
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] main',
      '[rn] a',
      '[rn] back',
    ]);
  });

  it('a yielded generator runs as a nested frame, one line per tick', () => {
    function* helper() {
      yield console.log('helper 1');
      yield console.log('helper 2');
    }
    function* outer() {
      yield helper();
      yield console.log('outer after');
    }
    function* main() {
      yield outer();
      yield console.log('main after');
    }
    const snapshots = simulate(
      asModule({ default: main, helper, outer }),
      unindent(`
        export function* helper() {
          yield console.log('helper 1');
          yield console.log('helper 2');
        }
        export function* outer() {
          yield helper();
          yield console.log('outer after');
        }
        export default function* main() {
          yield outer();
          yield console.log('main after');
        }
      `)
    );
    assert.deepEqual(
      snapshots.slice(1).map((snapshot) => core(snapshot, 'rn').line),
      [10, 6, 2, 3, 7, 11]
    );
    assert.deepEqual(core(snapshots[3], 'rn').callStack, [
      'main',
      'outer',
      'helper',
    ]);
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] helper 1',
      '[rn] helper 2',
      '[rn] outer after',
      '[rn] main after',
    ]);
  });

  it('copies arguments that cross runtimes', () => {
    const shared = { value: 1 };
    function* mutate(object: { value: number }) {
      yield (object.value = 2);
    }
    function* main() {
      yield scheduleOnUI(mutate, shared);
      yield console.log('rn sees', shared.value);
    }
    const snapshots = simulate(
      asModule({ default: main, mutate }),
      unindent(`
        export function* mutate(object) {
          yield (object.value = 2);
        }
        export default function* main() {
          yield scheduleOnUI(mutate, shared);
          yield console.log('rn sees', shared.value);
        }
      `)
    );
    assert.deepEqual(formatLogs(snapshots), ['[rn] rn sees 1']);
    assert.equal(shared.value, 1);
    assert.deepEqual(
      eventsOfType(snapshots, 'scheduled')[0].job,
      'mutate({"value":1})'
    );
  });

  it('scheduleOnUI on the UI runtime fails without Bundle Mode and works with it', () => {
    function* again() {
      yield console.log('again');
    }
    function* onUI() {
      yield scheduleOnUI(again);
    }
    function* main() {
      yield scheduleOnUI(onUI);
    }
    const module = asModule({ default: main, again, onUI });
    const source = unindent(`
      export function* again() {
        yield console.log('again');
      }
      export function* onUI() {
        yield scheduleOnUI(again);
      }
      export default function* main() {
        yield scheduleOnUI(onUI);
      }
    `);

    const failing = simulate(module, source);
    const errors = eventsOfType(failing, 'error');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].core, 'ui');
    assert.match(errors[0].message, /outside of the Bundle Mode/);
    assert.equal(core(failing[failing.length - 1], 'ui').status, 'error');
    assert.equal(failing[failing.length - 1].finished, true);

    const passing = simulate(module, source, { bundleMode: true });
    assert.equal(eventsOfType(passing, 'error').length, 0);
    assert.deepEqual(formatLogs(passing), ['[ui] again']);
    assert.deepEqual(
      eventsOfType(passing, 'scheduled').map((event) => event.core),
      ['rn', 'ui']
    );
  });

  it('gives a yield expression the value that was yielded', () => {
    function* main() {
      const worker = yield createWorkletRuntime({ name: 'calc' });
      yield console.log('got', worker);
      yield scheduleOnRuntime(worker, job, worker);
    }
    function* job(runtime: { name: string }) {
      yield console.log('running on', runtime);
    }
    const snapshots = simulate(
      asModule({ default: main, job }),
      unindent(`
        export function* job(runtime) {
          yield console.log('running on', runtime);
        }
        export default function* main() {
          const worker = yield createWorkletRuntime({ name: 'calc' });
          yield console.log('got', worker);
          yield scheduleOnRuntime(worker, job, worker);
        }
      `)
    );
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] got runtime "calc"',
      '[worker:calc] running on runtime "calc"',
    ]);
    assert.deepEqual(
      snapshots.slice(1).map((snapshot) => core(snapshot, 'rn').line),
      [5, 6, 7, null]
    );
  });

  it('createWorkletRuntime and scheduleOnUI fail on a worker without Bundle Mode', () => {
    function* nested() {
      yield createWorkletRuntime({ name: 'inner' });
    }
    function* main() {
      const worker = yield createWorkletRuntime({ name: 'outer' });
      yield scheduleOnRuntime(worker, nested);
    }
    const module = asModule({ default: main, nested });
    const source = unindent(`
      export function* nested() {
        yield createWorkletRuntime({ name: 'inner' });
      }
      export default function* main() {
        const worker = yield createWorkletRuntime({ name: 'outer' });
        yield scheduleOnRuntime(worker, nested);
      }
    `);
    const failing = simulate(module, source);
    const errors = eventsOfType(failing, 'error');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].core, 'worker:outer');
    assert.match(errors[0].message, /createWorkletRuntime cannot be called/);

    const passing = simulate(module, source, { bundleMode: true });
    assert.equal(eventsOfType(passing, 'error').length, 0);
    assert.equal(passing[passing.length - 1].cores.length, 4);
  });

  it('can run without a UI Runtime', () => {
    function* onUI() {
      yield console.log('ui');
    }
    function* main() {
      yield console.log('rn only');
      yield scheduleOnUI(onUI);
    }
    const module = asModule({ default: main, onUI });
    const source = unindent(`
      export function* onUI() {
        yield console.log('ui');
      }
      export default function* main() {
        yield console.log('rn only');
        yield scheduleOnUI(onUI);
      }
    `);
    const snapshots = simulate(module, source, { uiRuntime: false });
    assert.deepEqual(
      snapshots[0].cores.map((candidate) => [
        candidate.id,
        candidate.hasRuntime,
      ]),
      [
        ['ui', false],
        ['rn', true],
      ]
    );
    const errors = eventsOfType(snapshots, 'error');
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /no UI Runtime/);
  });

  it('runs a native main on the UI thread even without a UI Runtime', () => {
    function* onJS() {
      yield console.log('js');
    }
    function* main() {
      'native';
      yield console.log('touch');
      yield scheduleOnRN(onJS);
    }
    const snapshots = simulate(
      asModule({ default: main, onJS }),
      unindent(`
        export function* onJS() {
          yield console.log('js');
        }
        export default function* main() {
          'native';
          yield console.log('touch');
          yield scheduleOnRN(onJS);
        }
      `),
      { uiRuntime: false }
    );
    assert.deepEqual(formatTrace(snapshots), [
      't1  UI:L6   RN:-    | log(ui) "touch"',
      't2  UI:L7   RN:-    | schedule(ui→rn) onJS() via cross-runtime',
      't3  UI:-    RN:L2   | log(rn) "js"',
    ]);
  });

  it('reports a recursion that exceeds maxDepth', () => {
    function* forever(): Generator<unknown, void, unknown> {
      yield forever();
    }
    function* main() {
      yield forever();
    }
    const snapshots = simulate(
      asModule({ default: main, forever }),
      unindent(`
        export function* forever() {
          yield forever();
        }
        export default function* main() {
          yield forever();
        }
      `),
      { maxDepth: 4 }
    );
    const errors = eventsOfType(snapshots, 'error');
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /call stack exceeded 4 frames/);
  });

  it('throws when the simulation never finishes', () => {
    function* ping(): Generator<unknown, void, unknown> {
      yield scheduleOnRN(pong);
    }
    function* pong(): Generator<unknown, void, unknown> {
      yield scheduleOnUI(ping);
    }
    function* main() {
      yield scheduleOnUI(ping);
    }
    assert.throws(
      () =>
        simulate(
          asModule({ default: main, ping, pong }),
          unindent(`
            export function* ping() {
              yield scheduleOnRN(pong);
            }
            export function* pong() {
              yield scheduleOnUI(ping);
            }
            export default function* main() {
              yield scheduleOnUI(ping);
            }
          `),
          { maxTicks: 20 }
        ),
      /did not finish within 20 ticks/
    );
  });

  it('rejects interceptor calls outside of a simulation step', () => {
    function* noop() {
      yield 1;
    }
    assert.throws(() => scheduleOnUI(noop), /outside of a simulation step/);
  });

  it('runs a loop with a bare yield once per iteration', () => {
    function* spin() {
      for (let i = 0; i < 3; i++) {
        yield;
      }
    }
    function* main() {
      yield spin();
      yield console.log('done');
    }
    const snapshots = simulate(
      asModule({ default: main, spin }),
      unindent(`
        export function* spin() {
          for (let i = 0; i < 3; i++) {
            yield;
          }
        }
        export default function* main() {
          yield spin();
          yield console.log('done');
        }
      `)
    );
    assert.deepEqual(
      snapshots.slice(1).map((snapshot) => core(snapshot, 'rn').line),
      [7, 3, 3, 3, 3, 8]
    );
    assert.deepEqual(formatLogs(snapshots), ['[rn] done']);
  });

  it('an external input runs a native job on the UI thread at its tick', () => {
    function* handlePress(count) {
      'native';
      yield scheduleOnRN(onPress, count);
    }
    function* onPress(count) {
      yield console.log(`pressed ${count}`);
      yield updateScreen({ nativeProps: { counter: { text: `${count}` } } });
    }
    function* main() {
      yield console.log('ready');
    }
    const snapshots = simulate(
      asModule({ default: main, handlePress, onPress }),
      unindent(`
        export function* handlePress(count) {
          'native';
          yield scheduleOnRN(onPress, count);
        }
        export function* onPress(count) {
          yield console.log(\`pressed \${count}\`);
          yield updateScreen({ nativeProps: { counter: { text: \`\${count}\` } } });
        }
        export default function* main() {
          yield console.log('ready');
        }
      `),
      {
        uiRuntime: false,
        inputs: [{ tick: 2, core: 'ui', fn: 'handlePress', args: [1] }],
      }
    );
    assert.equal(core(snapshots[2], 'ui').status, 'running');
    assert.deepEqual(formatLogs(snapshots), ['[rn] ready', '[rn] pressed 1']);
    const last = snapshots[snapshots.length - 1];
    assert.deepEqual(last.screen.nativeProps, { counter: { text: '1' } });
  });

  it('await suspends the job until the async result is delivered', () => {
    const snapshots = runSnippet('returningAsync');
    const awaiting = snapshots.find((snapshot) =>
      core(snapshot, 'rn').pending.some((job) => job.awaiting === true)
    );
    assert.ok(awaiting !== undefined);
    assert.equal(core(awaiting, 'rn').status, 'running');
    assert.equal(core(snapshots[awaiting.tick + 1], 'rn').status, 'idle');
    assert.deepEqual(formatLogs(snapshots).slice(-1), ['[rn] 42 42']);
  });

  it('runOnRuntimeSync waits while the target runtime is busy', () => {
    function* busy() {
      yield console.log('busy 1');
      yield console.log('busy 2');
      yield console.log('busy 3');
      yield console.log('busy 4');
    }
    function* poll() {
      return yield 7;
    }
    function* main() {
      const worker = yield createWorkletRuntime();
      yield scheduleOnRuntime(worker, busy);
      yield console.log('rn works');
      yield console.log('rn works more');
      const value = yield runOnRuntimeSync(worker, poll);
      yield console.log(value);
    }
    const snapshots = simulate(
      asModule({ default: main, busy, poll }),
      unindent(`
        export function* busy() {
          yield console.log('busy 1');
          yield console.log('busy 2');
          yield console.log('busy 3');
          yield console.log('busy 4');
        }
        export function* poll() {
          return yield 7;
        }
        export default function* main() {
          const worker = yield createWorkletRuntime();
          yield scheduleOnRuntime(worker, busy);
          yield console.log('rn works');
          yield console.log('rn works more');
          const value = yield runOnRuntimeSync(worker, poll);
          yield console.log(value);
        }
      `)
    );
    const waiting = snapshots.filter(
      (snapshot) => core(snapshot, 'rn').waitingFor === 'worker:worker'
    );
    assert.equal(waiting.length, 1);
    assert.equal(core(waiting[0], 'rn').waitingFor, 'worker:worker');
    assert.deepEqual(core(waiting[0], 'rn').heldRuntimes, ['rn']);
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] rn works',
      '[worker:worker] busy 1',
      '[rn] rn works more',
      '[worker:worker] busy 2',
      '[worker:worker] busy 3',
      '[worker:worker] busy 4',
      '[rn] 7',
    ]);
  });

  it('a sync claim on a free runtime blocks it from the same tick on', () => {
    const source = snippetSource('syncShareable');
    const snapshots = simulate(syncShareable, source, { durationTicks: 200 });
    const claimLine =
      source.split('\n').findIndex((line) => line.includes('getSync')) + 1;
    const claimTick = snapshots.find((snapshot) =>
      snapshot.events.some(
        (event) =>
          event.type === 'exec' &&
          event.core === 'rn' &&
          event.line === claimLine
      )
    );
    assert.ok(claimTick !== undefined);
    for (const snapshot of [claimTick, snapshots[claimTick.tick + 1]]) {
      const worker = core(snapshot, 'worker:worker');
      assert.equal(worker.waitingFor, 'worker:worker');
      assert.deepEqual(worker.heldRuntimes, []);
      assert.deepEqual(core(snapshot, 'rn').heldRuntimes, [
        'rn',
        'worker:worker',
      ]);
      assert.ok(
        !snapshot.events.some(
          (event) => event.type === 'exec' && event.core === 'worker:worker'
        )
      );
    }
    assert.equal(
      core(snapshots[claimTick.tick + 2], 'worker:worker').waitingFor,
      null
    );
  });

  it('an interval does not stack callbacks while its runtime is blocked', () => {
    const source = snippetSource('syncShareable');
    const snapshots = simulate(syncShareable, source, { durationTicks: 200 });
    for (const snapshot of snapshots) {
      const worker = snapshot.cores.find(
        (candidate) => candidate.id === 'worker:worker'
      );
      if (worker === undefined) {
        continue;
      }
      const queued = worker.pending.filter(
        (job) => job.name === 'task' && job.timer !== true
      );
      assert.ok(queued.length <= 1, `tick ${snapshot.tick}: ${queued.length}`);
    }
  });

  it('getSync on a Shareable acquires the Host Runtime and reads the value', () => {
    const source = snippetSource('syncShareable');
    const snapshots = simulate(syncShareable, source, { durationTicks: 200 });
    const reading = snapshots.find((snapshot) =>
      snapshot.events.some(
        (event) => event.type === 'memory' && event.core === 'rn'
      )
    );
    assert.ok(reading !== undefined);
    assert.deepEqual(core(reading, 'rn').heldRuntimes, ['rn', 'worker:worker']);
    const logs = formatLogs(snapshots);
    assert.match(logs[0], /^\[rn\] sync: \d+$/);
    assert.match(logs[1], /^\[rn\] async: \d+$/);
    const last = snapshots[snapshots.length - 1];
    assert.equal(last.memory[0].kind, 'shareable');
    assert.equal(last.memory[0].host, 'worker:worker');
    assert.deepEqual(last.memory[0].guests, ['rn']);
  });

  it('a Synchronizable is written by the worker and read by RN without a cross-runtime call', () => {
    const source = snippetSource('syncSynchronizable');
    const snapshots = simulate(syncSynchronizable, source, {
      durationTicks: 200,
    });
    const scheduled = snapshots.flatMap((snapshot) =>
      snapshot.events.filter((event) => event.type === 'scheduled')
    );
    assert.equal(scheduled.length, 1);
    const reads = snapshots.flatMap((snapshot) =>
      snapshot.events.filter(
        (event) => event.type === 'memory' && event.mode === 'read'
      )
    );
    assert.equal(reads.length, 1);
    assert.equal(reads[0].core, 'rn');
    assert.deepEqual(formatLogs(snapshots), ['[rn] 8']);
  });

  it('tick() is a no-op after the simulation finished', () => {
    function* main() {
      yield console.log('once');
    }
    const machine = new Machine(
      loadSnippet(
        asModule({ default: main }),
        'export default function* main() {\n  yield console.log("once");\n}\n'
      )
    );
    const first = machine.tick();
    const second = machine.tick();
    assert.equal(first.finished, true);
    assert.equal(second.tick, first.tick);
  });
});
