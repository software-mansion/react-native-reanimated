import {
  createWorkletRuntime,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSyncWithId,
  UIRuntimeId,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimeFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

type LocalGlobal = typeof globalThis & {
  weakRefTest?: WeakRef<object>;
  gc: () => void;
};

describe('WeakRef on Worklet Runtime', () => {
  const workletRuntime = getWorkletRuntimeFromPool('test');
  const runtimes = [
    {
      name: 'UI',
      runtimeId: UIRuntimeId,
    },
    {
      name: 'Worker',
      runtimeId: workletRuntime.runtimeId,
    },
  ];

  runtimes.forEach(({ name, runtimeId }) => {
    test(`is available on ${name} Runtime`, async () => {
      const isWeakRefAvailable = await runOnRuntimeAsyncWithId(
        runtimeId,
        () => {
          'worklet';
          return typeof WeakRef === 'function';
        }
      );

      expect(isWeakRefAvailable).toBe(true);
    });

    test(`releases targets on ${name} Runtime after draining microtasks`, async () => {
      await runOnRuntimeAsyncWithId(runtimeId, () => {
        'worklet';
        const globals = globalThis as LocalGlobal;
        const target = {};
        globals.weakRefTest = new WeakRef(target);
      });

      const isTargetAliveBeforeGC = await runOnRuntimeAsyncWithId(
        runtimeId,
        () => {
          'worklet';
          const globals = globalThis as LocalGlobal;
          return globals.weakRefTest?.deref() !== undefined;
        }
      );
      expect(isTargetAliveBeforeGC).toBe(true);

      const wasTargetCollected = await runOnRuntimeAsyncWithId(
        runtimeId,
        () => {
          'worklet';
          const globals = globalThis as LocalGlobal;
          globals.gc();
          const wasCollected = globals.weakRefTest?.deref() === undefined;
          delete globals.weakRefTest;
          return wasCollected;
        }
      );

      expect(wasTargetCollected).toBe(true);
    });

    test(`releases targets after synchronous execution on ${name} Runtime`, () => {
      runOnRuntimeSyncWithId(runtimeId, () => {
        'worklet';
        const globals = globalThis as LocalGlobal;
        const target = {};
        globals.weakRefTest = new WeakRef(target);
      });

      const isTargetAliveBeforeGC = runOnRuntimeSyncWithId(runtimeId, () => {
        'worklet';
        const globals = globalThis as LocalGlobal;
        return globals.weakRefTest?.deref() !== undefined;
      });
      expect(isTargetAliveBeforeGC).toBe(true);

      const wasTargetCollected = runOnRuntimeSyncWithId(runtimeId, () => {
        'worklet';
        const globals = globalThis as LocalGlobal;
        globals.gc();
        const wasCollected = globals.weakRefTest?.deref() === undefined;
        delete globals.weakRefTest;
        return wasCollected;
      });

      expect(wasTargetCollected).toBe(true);
    });
  });

  test('is unavailable on a Worker Runtime with the event loop disabled', async () => {
    const runtime = createWorkletRuntime({
      name: 'weak-ref-without-event-loop',
      enableEventLoop: false,
    });

    const isWeakRefAvailable = await runOnRuntimeAsyncWithId(
      runtime.runtimeId,
      () => {
        'worklet';
        return typeof WeakRef === 'function';
      }
    );

    expect(isWeakRefAvailable).toBe(false);
  });
});
