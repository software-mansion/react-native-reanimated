import {
  runOnRuntimeSync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
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

describe('runOnRuntimeSync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

  const workletRuntime1 = getWorkletRuntimeFromPool('test');
  const workletRuntime2 = getWorkletRuntimeFromPool('test2');

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

  test('schedules on RN Runtime to a Worker Runtime', () => {
    const result = runOnRuntimeSync(workletRuntime1, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('schedules on UI Runtime to a Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';

        const result = runOnRuntimeSync(workletRuntime1, () => {
          'worklet';
          return 42;
        });

        scheduleOnRN(callbackPass, result);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('schedules on Worker Runtime to another Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';

        const result = runOnRuntimeSync(workletRuntime2, () => {
          'worklet';
          return 42;
        });

        scheduleOnRN(callbackPass, result);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
  } else if (__DEV__) {
    test('throws when scheduling on UI Runtime to a Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnRuntimeSync(workletRuntime1, () => {
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
        '[Worklets] runOnRuntimeSync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });

    test('throws when scheduling on Worker Runtime to another Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeSync(workletRuntime2, () => {
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
        '[Worklets] runOnRuntimeSync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });
  }

  test('does not drain microtasks after synchronous execution', () => {
    const counter = startCountingMicrotaskDrains(workletRuntime1.runtimeId);

    runOnRuntimeSync(workletRuntime1, () => {
      'worklet';
    });

    const microtaskDrainCount = stopCountingMicrotaskDrains(
      workletRuntime1.runtimeId,
      counter
    );

    expect(microtaskDrainCount).toBe(0);
  });

  test('leaves microtasks queued until the next scheduled task drains them', async () => {
    runOnRuntimeSync(workletRuntime1, () => {
      'worklet';
      globalThis.didRunMicrotask = false;
      queueMicrotask(() => {
        globalThis.didRunMicrotask = true;
        scheduleOnRN(callbackPass, 42);
      });
    });

    const didRunMicrotaskAfterSyncCall = runOnRuntimeSync(
      workletRuntime1,
      () => {
        'worklet';
        return globalThis.didRunMicrotask;
      }
    );

    expect(didRunMicrotaskAfterSyncCall).toBe(false);

    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
    });
    await waitForNotification(PASS_NOTIFICATION);

    const didRunMicrotaskAfterScheduledTask = runOnRuntimeSync(
      workletRuntime1,
      () => {
        'worklet';
        const result = globalThis.didRunMicrotask;
        globalThis.didRunMicrotask = undefined;
        return result;
      }
    );

    expect(didRunMicrotaskAfterScheduledTask).toBe(true);
    expect(value).toBe(42);
  });
});
