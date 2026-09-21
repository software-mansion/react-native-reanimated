import {
  createSynchronizable,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  beforeEach,
  createOrderConstraint,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

describe('scheduleOnUI', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (rea: string) => {
    reason = rea;
    notify(FAIL_NOTIFICATION);
  };

  beforeEach(() => {
    value = 0;
    reason = '';
  });

  test('schedules on RN Runtime to UI Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('preserves queued UI work before a UI caller', async () => {
      const [confirmedOrder, order] = createOrderConstraint();
      const uiActive = createSynchronizable(false);
      const queued = createSynchronizable(false);
      const [first, second] = ['first', 'second'];

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        const deadline = performance.now() + 1000;
        while (!uiActive.getBlocking() && performance.now() < deadline) {
          uiActive.getBlocking();
        }
        if (!uiActive.getBlocking()) {
          throw new Error('UI job did not start.');
        }
        scheduleOnUI(() => {
          'worklet';
          order(1, first);
        });
        queued.setBlocking(true);
      });

      scheduleOnUI(() => {
        'worklet';
        uiActive.setBlocking(true);
        const deadline = performance.now() + 1000;
        while (!queued.getBlocking() && performance.now() < deadline) {
          queued.getBlocking();
        }
        if (!queued.getBlocking()) {
          throw new Error('Worker did not enqueue the UI job.');
        }
        scheduleOnUI(() => {
          'worklet';
          order(2, second);
        });
      });

      await waitForNotification(first);
      await waitForNotification(second);
      expect(confirmedOrder.value).toBe(2);
    });

    test('schedules on UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        scheduleOnUI(() => {
          'worklet';
          scheduleOnRN(callbackPass, 42);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('schedules on Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        scheduleOnUI(() => {
          'worklet';
          scheduleOnRN(callbackPass, 42);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
  } else if (__DEV__) {
    test('throws when scheduling on UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          scheduleOnUI(() => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(
            callbackFail,
            error instanceof Error ? error.message : String(error)
          );
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnUI cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });

    test('throws when scheduling on Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        try {
          scheduleOnUI(() => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(
            callbackFail,
            error instanceof Error ? error.message : String(error)
          );
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnUI cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });
  }
});
