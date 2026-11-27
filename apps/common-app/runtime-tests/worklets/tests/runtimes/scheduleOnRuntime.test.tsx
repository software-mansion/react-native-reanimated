import {
  scheduleOnRuntime,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

describe('scheduleOnRuntime', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;

  const [workletRuntime1, workletRuntime2] = getWorkletRuntimesFromPool(2);

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    value = 0;
  });

  test('schedules on RN Runtime to a Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('schedules on UI Runtime to a Worker Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';

      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        scheduleOnRN(callbackPass, 42);
      });
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('schedules on Worker Runtime to another Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';

      scheduleOnRuntime(workletRuntime2, () => {
        'worklet';
        scheduleOnRN(callbackPass, 42);
      });
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
});
