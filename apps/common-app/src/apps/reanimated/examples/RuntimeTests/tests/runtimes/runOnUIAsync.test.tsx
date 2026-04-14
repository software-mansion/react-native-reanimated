import {
  createWorkletRuntime,
  runOnUIAsync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';
import { beforeEach, describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

describe('runOnUIAsync', () => {
  const FAIL_NOTIFICATION = 'FAIL';
  let reason = '';
  const errorMessage = '[Worklets] `runOnUIAsync` can only be called on the RN Runtime.';

  const workletRuntime = createWorkletRuntime({ name: 'test' });

  const callbackFail = (rea: string) => {
    reason = rea;
    notify(FAIL_NOTIFICATION);
  };

  test('setup beforeEach', () => {
    // TODO: there's a bug in ReJest and beforeEach has to be registered
    // inside a test case.
    beforeEach(() => {
      reason = '';
    });
  });

  test('schedules on RN Runtime to UI Runtime', async () => {
    const result = await runOnUIAsync(() => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('throws when scheduling on UI Runtime to UI Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      try {
        // eslint-disable-next-line no-void
        void runOnUIAsync(() => {
          'worklet';
          return 42;
        });
      } catch (error) {
        scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(reason).toBe(errorMessage);
  });

  test('throws when scheduling on Worker Runtime to UI Runtime', async () => {
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      try {
        // eslint-disable-next-line no-void
        void runOnUIAsync(() => {
          'worklet';
          return 42;
        });
      } catch (error) {
        scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(reason).toBe(errorMessage);
  });
});
