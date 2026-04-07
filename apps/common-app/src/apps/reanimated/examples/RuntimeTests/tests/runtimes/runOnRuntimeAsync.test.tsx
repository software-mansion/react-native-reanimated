import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';
import { beforeEach, describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

describe('runOnRuntimeAsync', () => {
  const FAIL_NOTIFICATION = 'FAIL';
  let reason = '';
  const errorMessage = '[Worklets] `runOnRuntimeAsync` can only be called on the RN Runtime.';

  const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
  const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

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

  test('schedules on RN Runtime to a Worker Runtime', async () => {
    const result = await runOnRuntimeAsync(workletRuntime1, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('throws when scheduling on UI Runtime to a Worker Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      try {
        // eslint-disable-next-line no-void
        void runOnRuntimeAsync(workletRuntime1, () => {
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

  test('throws when scheduling on Worker Runtime to self', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      try {
        // eslint-disable-next-line no-void
        void runOnRuntimeAsync(workletRuntime1, () => {
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

  test('throws when scheduling on Worker Runtime to another Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      try {
        // eslint-disable-next-line no-void
        void runOnRuntimeAsync(workletRuntime2, () => {
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
