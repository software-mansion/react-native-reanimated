import {
  createWorkletRuntime,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSyncWithId,
  UIRuntimeId,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

describe('WeakRef on Worklet Runtime', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);
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
        const target = {};
        globalThis.weakRefTest = new WeakRef(target);
      });

      const isTargetAliveBeforeGC = await runOnRuntimeAsyncWithId(
        runtimeId,
        () => {
          'worklet';
          return globalThis.weakRefTest?.deref() !== undefined;
        }
      );
      expect(isTargetAliveBeforeGC).toBe(true);

      const wasTargetCollected = await runOnRuntimeAsyncWithId(
        runtimeId,
        () => {
          'worklet';
          globalThis.gc!();
          const wasCollected = globalThis.weakRefTest?.deref() === undefined;
          delete globalThis.weakRefTest;
          return wasCollected;
        }
      );

      expect(wasTargetCollected).toBe(true);
    });

    test(`does not release targets after synchronous execution on ${name} Runtime`, () => {
      runOnRuntimeSyncWithId(runtimeId, () => {
        'worklet';
        const target = {};
        globalThis.weakRefTest = new WeakRef(target);
      });

      const isTargetAliveBeforeGC = runOnRuntimeSyncWithId(runtimeId, () => {
        'worklet';
        return globalThis.weakRefTest?.deref() !== undefined;
      });
      expect(isTargetAliveBeforeGC).toBe(true);

      const wasTargetCollected = runOnRuntimeSyncWithId(runtimeId, () => {
        'worklet';
        globalThis.gc!();
        const wasCollected = globalThis.weakRefTest?.deref() === undefined;
        delete globalThis.weakRefTest;
        return wasCollected;
      });

      expect(wasTargetCollected).toBe(false);
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

declare global {
  var weakRefTest: WeakRef<object> | undefined;
}
