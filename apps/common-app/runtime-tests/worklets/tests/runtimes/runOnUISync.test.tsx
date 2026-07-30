import {
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import {
  beforeEach,
  describe,
  expect,
  getWorkletRuntimeFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import {
  startCountingMicrotaskDrains,
  stopCountingMicrotaskDrains,
} from './microtaskDrainCounter';

describe('runOnUISync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

  const workletRuntime = getWorkletRuntimeFromPool('test');

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

  test('schedules on RN Runtime to UI Runtime', () => {
    const result = runOnUISync(() => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('schedules on UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';

        const result = runOnUISync(() => {
          'worklet';
          return 42;
        });

        scheduleOnRN(callbackPass, result);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('schedules on Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';

        const result = runOnUISync(() => {
          'worklet';
          return 42;
        });

        scheduleOnRN(callbackPass, result);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
  } else if (__DEV__) {
    test('throws when scheduling on UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnUISync(() => {
            'worklet';
            return 42;
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
        '[Worklets] runOnUISync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });

    test('throws when scheduling on Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        try {
          runOnUISync(() => {
            'worklet';
            return 42;
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
        '[Worklets] runOnUISync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });
  }

  test('does not drain microtasks after synchronous execution', () => {
    const counter = startCountingMicrotaskDrains(UIRuntimeId);

    runOnUISync(() => {
      'worklet';
    });

    const microtaskDrainCount = stopCountingMicrotaskDrains(
      UIRuntimeId,
      counter
    );

    expect(microtaskDrainCount).toBe(0);
  });

  test('runs microtasks queued during synchronous execution on the next animation frame', async () => {
    runOnUISync(() => {
      'worklet';
      queueMicrotask(() => {
        scheduleOnRN(callbackPass, 42);
      });
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
});
