import {
  createSynchronizable,
  runOnRuntimeAsync,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  runOnUIAsync,
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const DONE_NOTIFICATION = 'DONE';

describe('microtask draining', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const microtaskDrainCount = createSynchronizable(0);

  const notifyDone = () => {
    notify(DONE_NOTIFICATION);
  };

  function restoreCallMicrotasks(runtimeId: number) {
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
      if (globalThis.originalCallMicrotasks) {
        globalThis.__callMicrotasks = globalThis.originalCallMicrotasks;
        globalThis.originalCallMicrotasks = undefined;
      }
    });
  }

  function startCountingMicrotaskDrains(runtimeId: number) {
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
      const previousCallMicrotasks = globalThis.__callMicrotasks;
      globalThis.originalCallMicrotasks = previousCallMicrotasks;
      globalThis.__callMicrotasks = () => {
        if (!new Error().stack!.includes('executeQueue')) {
          microtaskDrainCount.setBlocking((count) => count + 1);
        }
        previousCallMicrotasks();
      };
    });
    microtaskDrainCount.setBlocking(0);
  }

  function drainPendingMicrotasks(runtimeId: number) {
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
      globalThis.__callMicrotasks();
    });
  }

  const probeDrainingCall = () => {
    'worklet';
    queueMicrotask(() => {
      scheduleOnRN(notifyDone);
    });
  };

  const probeNonDrainingCall = () => {
    'worklet';
    queueMicrotask(() => {});
  };

  const cases: {
    name: string;
    runtimeId: number;
    expectedDrains: number;
    invoke: () => void | Promise<unknown>;
  }[] = [
    {
      name: 'scheduleOnUI',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => scheduleOnUI(probeDrainingCall),
    },
    {
      name: 'runOnUIAsync',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => runOnUIAsync(probeDrainingCall),
    },
    {
      name: 'runOnUISync',
      runtimeId: UIRuntimeId,
      expectedDrains: 0,
      invoke: () => runOnUISync(probeNonDrainingCall),
    },
    {
      name: 'scheduleOnRuntime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () => scheduleOnRuntime(workletRuntime, probeDrainingCall),
    },
    {
      name: 'scheduleOnRuntimeWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => scheduleOnRuntimeWithId(UIRuntimeId, probeDrainingCall),
    },
    {
      name: 'scheduleOnRuntimeWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () =>
        scheduleOnRuntimeWithId(workletRuntime.runtimeId, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeAsync',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () => runOnRuntimeAsync(workletRuntime, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeAsyncWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      expectedDrains: 1,
      invoke: () => runOnRuntimeAsyncWithId(UIRuntimeId, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeAsyncWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 1,
      invoke: () =>
        runOnRuntimeAsyncWithId(workletRuntime.runtimeId, probeDrainingCall),
    },
    {
      name: 'runOnRuntimeSync',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 0,
      invoke: () => runOnRuntimeSync(workletRuntime, probeNonDrainingCall),
    },
    {
      name: 'runOnRuntimeSyncWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      expectedDrains: 0,
      invoke: () => runOnRuntimeSyncWithId(UIRuntimeId, probeNonDrainingCall),
    },
    {
      name: 'runOnRuntimeSyncWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      expectedDrains: 0,
      invoke: () =>
        runOnRuntimeSyncWithId(workletRuntime.runtimeId, probeNonDrainingCall),
    },
  ];

  cases.forEach(({ name, runtimeId, expectedDrains, invoke }) => {
    describe(name, () => {
      beforeEach(() => {
        startCountingMicrotaskDrains(runtimeId);
      });

      afterEach(() => {
        restoreCallMicrotasks(runtimeId);
        drainPendingMicrotasks(runtimeId);
      });

      test(`drains microtasks ${expectedDrains} time(s)`, async () => {
        await invoke();
        if (expectedDrains > 0) {
          await waitForNotification(DONE_NOTIFICATION);
        }

        const microtaskDrains = microtaskDrainCount.getBlocking();
        expect(microtaskDrains).toBe(expectedDrains);
      });
    });
  });
});
