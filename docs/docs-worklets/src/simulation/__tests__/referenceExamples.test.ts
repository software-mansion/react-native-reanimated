import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLogs, simulate } from '../index';
import { asModule, snippetPath, snippetSource } from './helpers';
import {
  createWorkletRuntime,
  getCurrentThreadId,
  getRuntimeKind,
  createSynchronizable,
  isSynchronizable,
  globalThis as runtimeGlobal,
  isRNRuntime,
  isUIRuntime,
  isWorkletFunction,
  isWorkerRuntime,
  isWorkletRuntime,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSyncWithId,
  runOnUISync,
  scheduleOnRuntimeWithId,
  UIRuntimeId,
} from '../worklets';

function runExample(name: string) {
  return simulate(require(snippetPath(name)), snippetSource(name));
}

// Use the actual docs modules: assertions protect the explanations and console
// results, in addition to the existing smoke test for every snippet.
describe('reference examples', () => {
  for (const [name, expected] of Object.entries({
    createWorker: [],
    apiCreateShareable: ['[rn] hello hello'],
    apiCreateSynchronizable: [],
    apiIsSerializableRef: ['[rn] true', '[rn] false'],
    apiIsSynchronizable: ['[rn] true', '[rn] false', '[rn] 42'],
    apiCreateWorkletRuntime: [
      '[rn] Initializer thread: 0x7400',
      '[rn] Creator thread: 0x7400',
      '[worker:background] Ready',
      '[worker:background] Worker thread: 0x7800',
    ],
    compareSerializable: ['[ui] UI: 1', '[rn] RN: 0'],
    compareSynchronizable: ['[ui] UI: 1', '[rn] RN: 1'],
    compareShareable: ['[ui] UI: 1', '[rn] RN: 1'],
    apiScheduleOnUI: [
      '[ui] Hello from the UI Runtime!',
      '[rn] The RN Runtime continues',
    ],
    apiScheduleOnRuntime: [
      '[rn] The RN Runtime continues',
      '[worker:background] Hello from the background Worklet Runtime',
    ],
    apiScheduleOnRuntimeWithId: [
      '[rn] The RN Runtime continues',
      '[worker:background] Hello from the background Worklet Runtime',
    ],
    apiScheduleOnRN: ['[rn] Result on the RN Runtime: 4'],
    apiRunOnUIAsync: [
      '[rn] The RN Runtime continues while the result is pending',
      '[rn] 1',
    ],
    apiRunOnUISync: ['[rn] 1'],
    apiRunOnRuntimeSync: ['[rn] 4'],
    apiRunOnRuntimeSyncWithId: ['[rn] 4'],
    apiGetRuntimeKind: ['[rn] 1', '[ui] 2', '[worker:background] 3'],
    apiIsRNRuntime: ['[rn] true', '[ui] false', '[worker:background] false'],
    apiIsUIRuntime: ['[rn] false', '[ui] true', '[worker:background] false'],
    apiIsWorkerRuntime: [
      '[rn] false',
      '[ui] false',
      '[worker:background] true',
    ],
    apiIsWorkletRuntime: [
      '[rn] false',
      '[ui] true',
      '[worker:background] true',
    ],
    apiIsWorkletFunction: ['[rn] true', '[rn] false'],
    apiGetCurrentThreadId: ['[rn] 0x7400', '[ui] 0x7000', '[rn] 0x7400'],
    apiShareable: ['[rn] 42'],
    shareableAsync: [
      '[rn] The RN Runtime continues while the host reads the value',
      '[rn] 42',
    ],
    shareableHost: ['[rn] Host: 43', '[rn] Guest: 43'],
    serializableCopy: ['[ui] UI copy: 20', '[rn] RN original: 10'],
    apiSynchronizable: ['[ui] {"a":24}'],
    synchronizableUpdater: ['[rn] 2'],
    runtimeGlobals: ['[rn] RN global: 42', '[rn] UI global: undefined'],
    assignRuntimeGlobal: [
      '[rn] UI global before: undefined',
      '[rn] UI global after: 42',
    ],
    rnTimer: [
      '[rn] Synchronous work runs first',
      '[rn] Timer callback on the RN Runtime',
    ],
    uiFrames: ['[ui] UI frame: 1', '[ui] UI frame: 2', '[ui] UI frame: 3'],
    workerInterval: [
      '[worker:background] Worker tick: 1',
      '[worker:background] Worker tick: 2',
      '[worker:background] Worker tick: 3',
    ],
  })) {
    it(`${name} produces the documented result and finishes`, () => {
      const snapshots = runExample(name);
      assert.deepEqual(formatLogs(snapshots), expected);
      assert.equal(snapshots.at(-1)!.finished, true);
    });
  }

  it('initializes the new runtime on the creating thread before returning its handle', () => {
    function* initialize() {
      'worklet';
      yield (runtimeGlobal.ready = true);
      yield console.log(getRuntimeKind(), getCurrentThreadId());
      return yield 'ignored initializer result';
    }
    function* inspect() {
      yield console.log(runtimeGlobal.ready);
    }
    function* main() {
      const worker = yield createWorkletRuntime({
        name: 'background',
        initializer: initialize,
      });
      yield console.log(worker.name, runtimeGlobal.ready);
      yield runOnRuntimeSyncWithId(worker.runtimeId, inspect);
    }
    const snapshots = simulate(
      asModule({ default: main, initialize, inspect }),
      [initialize, inspect, main].map((fn) => fn.toString()).join('\n')
    );
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] 3 0x7400',
      '[rn] background undefined',
      '[rn] true',
    ]);
    const initialized = snapshots.find((snapshot) =>
      snapshot.cores.some(
        (core) =>
          core.id === 'worker:background' && core.globals.ready === 'true'
      )
    )!;
    assert.ok(initialized);
    assert.ok(
      initialized.resources.some(
        (resource) =>
          resource.id === 'worker:background' && resource.holder === 'rn'
      )
    );
    assert.equal(snapshots.at(-1)!.finished, true);
  });

  it('rejects an unmarked initializer and stops when a worklet initializer throws', () => {
    function* ordinary() {
      yield console.log('must not run');
    }
    function* throws() {
      'worklet';
      yield console.log('initializing');
      throw new Error('initializer failed');
    }
    for (const initializer of [ordinary, throws]) {
      function* main() {
        yield createWorkletRuntime({ initializer });
        yield console.log('must not continue');
      }
      const snapshots = simulate(
        asModule({ default: main, ordinary, throws }),
        [ordinary, throws, main].map((fn) => fn.toString()).join('\n')
      );
      assert.deepEqual(
        formatLogs(snapshots),
        initializer === ordinary ? [] : ['[rn] initializing']
      );
      const errors = snapshots.flatMap((snapshot) =>
        snapshot.events.filter((event) => event.type === 'error')
      );
      assert.equal(errors.length, 1);
      assert.match(
        errors[0].message,
        initializer === ordinary
          ? /initializer.*not a worklet/
          : /initializer failed/
      );
      assert.equal(snapshots.at(-1)!.finished, true);
    }
  });

  it('recognizes Synchronizables on RN and UI and rejects ordinary values', () => {
    let counter: unknown;
    function* inspect() {
      yield console.log(
        isSynchronizable(counter),
        isSynchronizable(null),
        isSynchronizable(undefined),
        isSynchronizable(0),
        isSynchronizable({}),
        isSynchronizable({ __synchronizableRef: false })
      );
    }
    function* main() {
      counter = yield createSynchronizable(0);
      yield inspect();
      yield runOnUISync(inspect);
    }
    const snapshots = simulate(
      asModule({ default: main, inspect }),
      [inspect, main].map((fn) => fn.toString()).join('\n')
    );
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] true false false false false false',
      '[rn] true false false false false false',
    ]);
    assert.equal(snapshots.at(-1)!.finished, true);
  });

  it('shows the worker-to-UI call failing in Legacy Eval Mode and succeeding in Bundle Mode', () => {
    const name = 'callTableBundleMode';
    for (const bundleMode of [false, true]) {
      const snapshots = simulate(
        require(snippetPath(name)),
        snippetSource(name),
        { bundleMode }
      );
      const errors = snapshots.flatMap((snapshot) =>
        snapshot.events.filter((event) => event.type === 'error')
      );
      assert.deepEqual(
        formatLogs(snapshots),
        bundleMode
          ? [
              '[worker:background] Worker is running',
              '[ui] UI received the result',
            ]
          : ['[worker:background] Worker is running']
      );
      if (bundleMode) {
        assert.deepEqual(errors, []);
      } else {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].core, 'worker:background');
        assert.equal(
          errors[0].message,
          '[Worklets] scheduleOnUI cannot be called on Worklet Runtimes outside of the Bundle Mode.'
        );
        assert.match(
          snippetSource(name).split('\n')[errors[0].line! - 1],
          /yield scheduleOnUI\(showResult\)/
        );
      }
      assert.equal(snapshots.at(-1)!.finished, true);
    }
  });

  it('detects worklet functions on the current runtime without executing them', () => {
    function* worklet() {
      'worklet';
      yield console.log('Unexpected worklet execution');
    }
    function* ordinary() {
      yield console.log('Unexpected ordinary function execution');
    }
    function* inspect() {
      'worklet';
      yield console.log(
        isWorkletFunction(worklet),
        isWorkletFunction(ordinary),
        isWorkletFunction(undefined),
        isWorkletFunction(null),
        isWorkletFunction({}),
        isWorkletFunction(() => 1)
      );
    }
    function* main() {
      yield inspect();
      yield runOnUISync(inspect);
      const worker = yield createWorkletRuntime({ name: 'background' });
      yield runOnRuntimeSyncWithId(worker.runtimeId, inspect);
      yield inspect();
    }
    const snapshots = simulate(
      asModule({ default: main, worklet, ordinary, inspect }),
      [worklet, ordinary, inspect, main].map((fn) => fn.toString()).join('\n')
    );
    assert.deepEqual(formatLogs(snapshots), [
      '[rn] true false false false false false',
      '[rn] false false false false false false',
      '[rn] false false false false false false',
      '[rn] true false false false false false',
    ]);
    assert.equal(snapshots.at(-1)!.finished, true);
  });

  it('shows globals on the owning runtime at the highlighted assignment', () => {
    for (const name of ['runtimeGlobals', 'assignRuntimeGlobal']) {
      const snapshots = runExample(name);
      const globals = (tick: number, runtime: string) =>
        snapshots[tick].cores.find((core) => core.id === runtime)!.globals;
      assert.deepEqual(globals(0, 'rn'), {});
      assert.deepEqual(globals(1, 'rn'), { someValue: '42' });
      assert.deepEqual(globals(1, 'ui'), {});
      const last = snapshots.at(-1)!;
      assert.deepEqual(
        last.cores.find((core) => core.id === 'ui')!.globals,
        name === 'runtimeGlobals' ? {} : { someValue: '42' }
      );
      // Later writes must not change the history used by Back and Reset.
      assert.deepEqual(globals(0, 'rn'), {});
      assert.deepEqual(globals(1, 'ui'), {});
    }
  });

  it('shows both Synchronizables even when creation is the final line', () => {
    const snapshots = runExample('apiCreateSynchronizable');
    const last = snapshots.at(-1)!;
    assert.equal(last.finished, true);
    assert.deepEqual(
      last.memory.map((cell) => cell.value),
      ['{"a":42}', '0']
    );
    assert.equal(
      last.resources.filter((resource) => resource.kind === 'synchronizable')
        .length,
      2
    );
  });

  it('keeps the source object and earlier snapshots unchanged when UI edits its copy', () => {
    const snapshots = runExample('serializableCopy');
    const globals = (snapshot: (typeof snapshots)[number], runtime: string) =>
      snapshot.cores.find((core) => core.id === runtime)!.globals;
    const received = snapshots.find(
      (snapshot) => globals(snapshot, 'ui').settings === '{"volume":10}'
    )!;
    assert.ok(received);
    const changed = snapshots.find(
      (snapshot) => globals(snapshot, 'ui').settings === '{"volume":20}'
    )!;
    assert.ok(changed);
    assert.ok(changed.tick > received.tick);
    assert.deepEqual(globals(changed, 'rn'), { settings: '{"volume":10}' });
    assert.deepEqual(globals(received, 'ui'), { settings: '{"volume":10}' });
    const last = snapshots.at(-1)!;
    assert.deepEqual(globals(last, 'rn'), { settings: '{"volume":10}' });
    assert.deepEqual(globals(last, 'ui'), { settings: '{"volume":20}' });
    assert.equal(last.memory.length, 1);
    assert.equal(last.memory[0].kind, 'serializable');
    assert.equal(last.memory[0].value, '{"volume":10}');
    assert.ok(snapshots.some((snapshot) => snapshot.memory.length === 0));
    for (const snapshot of snapshots) {
      for (const cell of snapshot.memory) {
        assert.equal(cell.value, '{"volume":10}');
      }
    }
  });

  it('updates the Shareable on its highlighted assignment line', () => {
    const source = snippetSource('shareableHost');
    const assignment =
      source
        .split('\n')
        .findIndex((line) => line.includes('yield (shareable.value =')) + 1;
    const snapshots = runExample('shareableHost');
    const changed = snapshots.find((snapshot) =>
      snapshot.cores.some((core) => core.line === assignment)
    )!;
    assert.equal(changed.memory[0].value, '43');
    assert.equal(snapshots[changed.tick - 1].memory[0].value, '42');
  });

  for (const name of ['apiRunOnRuntimeAsync', 'apiRunOnRuntimeAsyncWithId']) {
    it(`${name} resumes on RN after the worker returns its result`, () => {
      const snapshots = runExample(name);
      assert.deepEqual(formatLogs(snapshots), [
        '[rn] The RN Runtime continues while the worker computes',
        '[rn] Computation result: 10',
      ]);
      assert.ok(
        snapshots.some((snapshot) =>
          snapshot.cores.some(
            (core) =>
              core.id === 'worker:background' && core.status === 'running'
          )
        )
      );
    });
  }

  it('checks the acquired runtime, rather than the executing thread', () => {
    function* inspect() {
      yield console.log(
        getCurrentThreadId(),
        getRuntimeKind(),
        isRNRuntime(),
        isUIRuntime(),
        isWorkerRuntime(),
        isWorkletRuntime()
      );
    }
    function* main() {
      const worker = yield createWorkletRuntime({ name: 'background' });
      yield inspect();
      yield runOnUISync(inspect);
      yield runOnRuntimeSyncWithId(worker.runtimeId, inspect);
    }
    const snapshots = simulate(
      asModule({ default: main, inspect }),
      `${inspect.toString()}\n${main.toString()}`
    );
    const logs = formatLogs(snapshots);
    const thread = logs[0].split(' ')[1];
    assert.deepEqual(logs, [
      `[rn] ${thread} 1 true false false false`,
      `[rn] ${thread} 2 false true false true`,
      `[rn] ${thread} 3 false false true true`,
    ]);
  });

  for (const api of [
    scheduleOnRuntimeWithId,
    runOnRuntimeAsyncWithId,
    runOnRuntimeSyncWithId,
  ]) {
    it(`${api.name} accepts the UI Runtime id and rejects unknown ids`, () => {
      function* inspect() {
        yield console.log(getRuntimeKind());
      }
      for (const id of [UIRuntimeId, 999]) {
        function* main() {
          yield api(id, inspect);
        }
        const snapshots = simulate(
          asModule({ default: main, inspect }),
          `${inspect.toString()}\n${main.toString()}`
        );
        const errors = snapshots.flatMap((snapshot) =>
          snapshot.events.filter((event) => event.type === 'error')
        );
        if (id === UIRuntimeId) {
          assert.equal(errors.length, 0);
          const thread = api === runOnRuntimeSyncWithId ? 'rn' : 'ui';
          assert.deepEqual(formatLogs(snapshots), [`[${thread}] 2`]);
        } else {
          assert.equal(errors.length, 1);
          assert.match(errors[0].message, /existing Worklet Runtime/);
        }
      }
    });
  }
});
