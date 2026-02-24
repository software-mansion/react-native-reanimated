import { createWorkletRuntime, scheduleOnRuntime, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification, beforeEach } from '../../ReJest/RuntimeTestsApi';

describe('scheduleOnRN', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  test('setup beforeEach', () => {
    // TODO: there's a bug in ReJest and beforeEach has to be registered
    // inside a test case.
    beforeEach(() => {
      value = 0;
    });
  });

  test('schedules on RN Runtime to RN Runtime', async () => {
    scheduleOnRN(callbackPass, 42);

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('schedules on UI Runtime to RN Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('schedules on Worker Runtime to RN Runtime', async () => {
    const workletRuntime = createWorkletRuntime({ name: 'test' });

    scheduleOnRuntime(workletRuntime, () => {
      'worklet';

      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
});
