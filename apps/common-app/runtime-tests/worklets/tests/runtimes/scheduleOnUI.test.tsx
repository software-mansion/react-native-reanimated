import {
  scheduleOnRuntime,
  scheduleOnRN,
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

describe('scheduleOnUI', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;

  const workletRuntime = getWorkletRuntimeFromPool('test');

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    value = 0;
  });

  test('schedules on RN Runtime to UI Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
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
});
