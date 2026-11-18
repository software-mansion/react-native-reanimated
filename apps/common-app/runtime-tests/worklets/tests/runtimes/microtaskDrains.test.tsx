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

const MICROTASK_NOT_RUN = 0;
const MICROTASK_RAN_OUTSIDE_FRAME = 1;
const MICROTASK_RAN_IN_FRAME = 2;

describe('microtask draining', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const checkpointProbe = (order: OrderSetter) => {
    'worklet';
    queueMicrotask(() => {
      order(2, 'microtask');
    });
    order(1, 'task');
  };

  const pendingMicrotaskProbe = (state: Synchronizable<number>) => {
    'worklet';
    queueMicrotask(() => {
      state.setBlocking(
        globalThis.__frameTimestamp === undefined
          ? MICROTASK_RAN_OUTSIDE_FRAME
          : MICROTASK_RAN_IN_FRAME
      );
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
    invoke: (state: Synchronizable<number>) => void;
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
        const state = createSynchronizable(MICROTASK_NOT_RUN);

        invoke(state);

        expect(state.getBlocking()).toBe(MICROTASK_RAN_OUTSIDE_FRAME);
      });
    });
  });

  const NESTED_NOTIFICATION = 'NESTED_SYNC_CALL';
  const nestedResults = new Map<number, boolean>();

  const onNestedResult = (token: number, ranDuringTask: boolean) => {
    nestedResults.set(token, ranDuringTask);
    notify(`${NESTED_NOTIFICATION}_${token}`);
  };

  const nestedSyncCallProbe = (runtimeId: number, token: number) => {
    'worklet';
    let microtaskRan = false;
    queueMicrotask(() => {
      microtaskRan = true;
    });
    runOnRuntimeSyncWithId(runtimeId, () => {
      'worklet';
    });
    scheduleOnRN(onNestedResult, token, microtaskRan);
  };

  const nestedSyncCallInTimeoutProbe = (runtimeId: number, token: number) => {
    'worklet';
    setTimeout(() => {
      nestedSyncCallProbe(runtimeId, token);
    }, 0);
  };

  const nestedCases: { name: string; invoke: (token: number) => void }[] = [
    {
      name: 'in a scheduled worklet, UI Runtime',
      invoke: (token) =>
        scheduleOnRuntimeWithId(
          UIRuntimeId,
          nestedSyncCallProbe,
          UIRuntimeId,
          token
        ),
    },
    {
      name: 'in a scheduled worklet, Worker Runtime',
      invoke: (token) =>
        scheduleOnRuntimeWithId(
          workletRuntime.runtimeId,
          nestedSyncCallProbe,
          workletRuntime.runtimeId,
          token
        ),
    },
    {
      name: 'in a setTimeout callback, UI Runtime',
      invoke: (token) =>
        scheduleOnRuntimeWithId(
          UIRuntimeId,
          nestedSyncCallInTimeoutProbe,
          UIRuntimeId,
          token
        ),
    },
    {
      name: 'in a setTimeout callback, Worker Runtime',
      invoke: (token) =>
        scheduleOnRuntimeWithId(
          workletRuntime.runtimeId,
          nestedSyncCallInTimeoutProbe,
          workletRuntime.runtimeId,
          token
        ),
    },
  ];

  const nestedTest = isBundleModeEnabled() ? test : test.skip;

  nestedCases.forEach(({ name, invoke }, token) => {
    describe(`synchronous call into the same runtime ${name}`, () => {
      nestedTest(
        'does not run queued microtasks before the outer task ends',
        async () => {
          nestedResults.delete(token);

          invoke(token);
          await waitForNotification(`${NESTED_NOTIFICATION}_${token}`);

          expect(nestedResults.get(token)).toBe(false);
        }
      );
    });
  });
});
