import type { Synchronizable } from 'react-native-worklets';
import {
  createSynchronizable,
  runOnRuntimeAsync,
  runOnRuntimeAsyncWithId,
  runOnRuntimeSync,
  runOnRuntimeSyncWithId,
  runOnUIAsync,
  runOnUISync,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import {
  createOrderConstraint,
  describe,
  expect,
  getWorkletRuntimeFromPool,
  test,
  waitForNotifications,
} from '../../../ReJest/RuntimeTestsApi';

type OrderSetter = ReturnType<typeof createOrderConstraint>[1];

describe('microtask draining', () => {
  const workletRuntime = getWorkletRuntimeFromPool('test');

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

  noCheckpointCases.forEach(({ name, invoke }) => {
    describe(name, () => {
      test('defers queued microtasks past the synchronous call', () => {
        const flag = createSynchronizable(false);

        invoke(flag);

        expect(flag.getBlocking()).toBe(false);
      });
    });
  });
});
