import type { Synchronizable } from 'react-native-worklets';
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
  createOrderConstraint,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

const DONE_NOTIFICATION = 'DONE';

type OrderSetter = ReturnType<typeof createOrderConstraint>[1];

describe('microtask draining', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const notifyDone = () => {
    notify(DONE_NOTIFICATION);
  };

  const flushProbe = () => {
    'worklet';
    queueMicrotask(() => {
      scheduleOnRN(notifyDone);
    });
  };

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

  const noCheckpointCases: {
    name: string;
    runtimeId: number;
    invoke: (flag: Synchronizable<boolean>) => void;
  }[] = [
    {
      name: 'runOnUISync',
      runtimeId: UIRuntimeId,
      invoke: (flag) => runOnUISync(pendingMicrotaskProbe, flag),
    },
    {
      name: 'runOnRuntimeSync',
      runtimeId: workletRuntime.runtimeId,
      invoke: (flag) =>
        runOnRuntimeSync(workletRuntime, pendingMicrotaskProbe, flag),
    },
    {
      name: 'runOnRuntimeSyncWithId, UI Runtime',
      runtimeId: UIRuntimeId,
      invoke: (flag) =>
        runOnRuntimeSyncWithId(UIRuntimeId, pendingMicrotaskProbe, flag),
    },
    {
      name: 'runOnRuntimeSyncWithId, Worker Runtime',
      runtimeId: workletRuntime.runtimeId,
      invoke: (flag) =>
        runOnRuntimeSyncWithId(
          workletRuntime.runtimeId,
          pendingMicrotaskProbe,
          flag
        ),
    },
  ];

  noCheckpointCases.forEach(({ name, runtimeId, invoke }) => {
    describe(name, () => {
      test('defers queued microtasks past the synchronous call', async () => {
        const flag = createSynchronizable(false);

        invoke(flag);

        expect(flag.getBlocking()).toBe(false);

        scheduleOnRuntimeWithId(runtimeId, flushProbe);
        await waitForNotification(DONE_NOTIFICATION);

        expect(flag.getBlocking()).toBe(true);
      });
    });
  });
});
