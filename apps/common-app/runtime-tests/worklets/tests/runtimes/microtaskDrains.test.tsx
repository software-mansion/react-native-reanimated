import type { Synchronizable } from 'react-native-worklets';
import {
  createSynchronizable,
  isBundleModeEnabled,
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
  createOrderConstraint,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

type OrderSetter = ReturnType<typeof createOrderConstraint>[1];

describe('microtask draining', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const checkpointProbe = (order: OrderSetter) => {
    'worklet';
    queueMicrotask(() => {
      order(2, 'microtask');
    });
    order(1, 'task');
  };

  const pendingMicrotaskProbe = (flag: Synchronizable<boolean>) => {
    'worklet';
    queueMicrotask(() => {
      flag.setBlocking(true);
    });
  };

  const checkpointCases: {
    name: string;
    invoke: (order: OrderSetter) => void | Promise<unknown>;
  }[] = [
    {
      name: 'scheduleOnUI',
      invoke: (order) => scheduleOnUI(checkpointProbe, order),
    },
    {
      name: 'runOnUIAsync',
      invoke: (order) => runOnUIAsync(checkpointProbe, order),
    },
    {
      name: 'scheduleOnRuntime',
      invoke: (order) =>
        scheduleOnRuntime(workletRuntime, checkpointProbe, order),
    },
    {
      name: 'scheduleOnRuntimeWithId, UI Runtime',
      invoke: (order) =>
        scheduleOnRuntimeWithId(UIRuntimeId, checkpointProbe, order),
    },
    {
      name: 'scheduleOnRuntimeWithId, Worker Runtime',
      invoke: (order) =>
        scheduleOnRuntimeWithId(
          workletRuntime.runtimeId,
          checkpointProbe,
          order
        ),
    },
    {
      name: 'runOnRuntimeAsync',
      invoke: (order) =>
        runOnRuntimeAsync(workletRuntime, checkpointProbe, order),
    },
    {
      name: 'runOnRuntimeAsyncWithId, UI Runtime',
      invoke: (order) =>
        runOnRuntimeAsyncWithId(UIRuntimeId, checkpointProbe, order),
    },
    {
      name: 'runOnRuntimeAsyncWithId, Worker Runtime',
      invoke: (order) =>
        runOnRuntimeAsyncWithId(
          workletRuntime.runtimeId,
          checkpointProbe,
          order
        ),
    },
  ];

  checkpointCases.forEach(({ name, invoke }) => {
    describe(name, () => {
      test('runs queued microtasks after the worklet, without a manual drain', async () => {
        const [confirmedOrder, order] = createOrderConstraint();

        await invoke(order);

        await waitForNotifications(['task', 'microtask']);
        expect(confirmedOrder.value).toBe(2);
      });
    });
  });

  const syncCases: {
    name: string;
    invoke: (flag: Synchronizable<boolean>) => void;
  }[] = [
    {
      name: 'runOnUISync',
      invoke: (flag) => runOnUISync(pendingMicrotaskProbe, flag),
    },
    {
      name: 'runOnRuntimeSync',
      invoke: (flag) =>
        runOnRuntimeSync(workletRuntime, pendingMicrotaskProbe, flag),
    },
    {
      name: 'runOnRuntimeSyncWithId, UI Runtime',
      invoke: (flag) =>
        runOnRuntimeSyncWithId(UIRuntimeId, pendingMicrotaskProbe, flag),
    },
    {
      name: 'runOnRuntimeSyncWithId, Worker Runtime',
      invoke: (flag) =>
        runOnRuntimeSyncWithId(
          workletRuntime.runtimeId,
          pendingMicrotaskProbe,
          flag
        ),
    },
  ];

  syncCases.forEach(({ name, invoke }) => {
    describe(name, () => {
      test('runs queued microtasks at the end of the synchronous call', () => {
        const flag = createSynchronizable(false);

        invoke(flag);

        expect(flag.getBlocking()).toBe(true);
      });
    });
  });

  const NESTED_NOTIFICATION = 'NESTED_SYNC_CALL';
  let microtaskRanDuringTask = true;

  const onNestedResult = (ranDuringTask: boolean) => {
    microtaskRanDuringTask = ranDuringTask;
    notify(NESTED_NOTIFICATION);
  };

  const nestedSyncCallProbe = (runtimeId: number) => {
    'worklet';
    let microtaskRan = false;
    queueMicrotask(() => {
      microtaskRan = true;
    });
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
    });
    scheduleOnRN(onNestedResult, microtaskRan);
  };

  const nestedSyncCallInTimeoutProbe = (runtimeId: number) => {
    'worklet';
    setTimeout(() => {
      nestedSyncCallProbe(runtimeId);
    }, 0);
  };

  const nestedCases: { name: string; invoke: () => void }[] = [
    {
      name: 'in a scheduled worklet, UI Runtime',
      invoke: () =>
        scheduleOnRuntimeWithId(UIRuntimeId, nestedSyncCallProbe, UIRuntimeId),
    },
    {
      name: 'in a scheduled worklet, Worker Runtime',
      invoke: () =>
        scheduleOnRuntimeWithId(
          workletRuntime.runtimeId,
          nestedSyncCallProbe,
          workletRuntime.runtimeId
        ),
    },
    {
      name: 'in a setTimeout callback, UI Runtime',
      invoke: () =>
        scheduleOnRuntimeWithId(
          UIRuntimeId,
          nestedSyncCallInTimeoutProbe,
          UIRuntimeId
        ),
    },
    {
      name: 'in a setTimeout callback, Worker Runtime',
      invoke: () =>
        scheduleOnRuntimeWithId(
          workletRuntime.runtimeId,
          nestedSyncCallInTimeoutProbe,
          workletRuntime.runtimeId
        ),
    },
  ];

  const runnableNestedCases = isBundleModeEnabled() ? nestedCases : [];

  runnableNestedCases.forEach(({ name, invoke }) => {
    describe(`synchronous call into the same runtime ${name}`, () => {
      test('does not run queued microtasks before the outer task ends', async () => {
        microtaskRanDuringTask = true;

        invoke();
        await waitForNotification(NESTED_NOTIFICATION);

        expect(microtaskRanDuringTask).toBe(false);
      });
    });
  });
});
