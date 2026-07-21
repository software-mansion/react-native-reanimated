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

describe('runOnRuntimeSync', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;

  const workletRuntime1 = getWorkletRuntimeFromPool('test');
  const workletRuntime2 = getWorkletRuntimeFromPool('test2');

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    value = 0;
  });

  test('schedules on RN Runtime to a Worker Runtime', () => {
    const result = runOnRuntimeSync(workletRuntime1, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

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
});
