import {
  createWorkletRuntime,
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';
import { beforeEach, describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

describe('runOnUISync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

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
      const workletRuntime = createWorkletRuntime({ name: 'test' });

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
  } else {
    test('throws when scheduling on UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnUISync(() => {
            'worklet';
            return 42;
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('[Worklets] runOnUISync cannot be called on Worklet Runtimes outside of the Bundle Mode.');
    });

    test('throws when scheduling on Worker Runtime to UI Runtime', async () => {
      const workletRuntime = createWorkletRuntime({ name: 'test' });

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        try {
          runOnUISync(() => {
            'worklet';
            return 42;
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('[Worklets] runOnUISync cannot be called on Worklet Runtimes outside of the Bundle Mode.');
    });
  }
});
