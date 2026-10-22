import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLogs, simulate } from '../index';
import { asModule, snippetPath, snippetSource } from './helpers';
import {
  createWorkletRuntime,
  getCurrentThreadId,
  getRuntimeKind,
  isRNRuntime,
  isUIRuntime,
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
    apiGetCurrentThreadId: ['[rn] 0x7400', '[ui] 0x7000', '[rn] 0x7400'],
    apiShareable: ['[rn] 42'],
    shareableAsync: [
      '[rn] The RN Runtime continues while the host reads the value',
      '[rn] 42',
    ],
    shareableHost: ['[rn] Host: 43', '[rn] Guest: 43'],
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
