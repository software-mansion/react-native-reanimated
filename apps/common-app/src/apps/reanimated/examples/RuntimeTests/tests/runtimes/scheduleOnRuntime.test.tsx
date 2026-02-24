import { createWorkletRuntime, scheduleOnRuntime, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { beforeEach, describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

describe('scheduleOnRuntime', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

  const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
  const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (rea: string) => {
    reason = rea;
    notify(FAIL_NOTIFICATION);
  };

  test('setup beforeEach', () => {
    // TODO: there's a bug in ReJest and beforeEach has to be registered
    // inside a test case.
    beforeEach(() => {
      value = 0;
      reason = '';
    });
  });

  test('schedules on RN Runtime to a Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('schedules on UI Runtime to a Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;

        scheduleOnRuntime(workletRuntime1, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('schedules on Worker Runtime to another Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;

        scheduleOnRuntime(workletRuntime2, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
  } else {
    test('throws when scheduling on UI Runtime to a Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          scheduleOnRuntime(workletRuntime1, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntime cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('throws when scheduling on Worker Runtime to another Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          scheduleOnRuntime(workletRuntime2, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntime cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });
  }
});
