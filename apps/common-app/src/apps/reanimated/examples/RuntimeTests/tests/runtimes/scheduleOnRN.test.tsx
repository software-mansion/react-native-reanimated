import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';
import {
  describe,
  expect,
  notify,
  test,
  waitForNotification,
  beforeEach,
} from '../../ReJest/RuntimeTestsApi';

describe('scheduleOnRN', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;
  const FAIL_NOTIFICATION = 'FAIL';
  let errorMessage = '';

  const workletRuntime = createWorkletRuntime({ name: 'test' });

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (message: string) => {
    errorMessage = message;
    notify(FAIL_NOTIFICATION);
  };

  beforeEach(() => {
    value = 0;
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
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';

      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('throws actionable error when a locally defined anonymous function is passed to scheduleOnRN on UI Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      try {
        scheduleOnRN(() => {});
      } catch (error) {
        scheduleOnRN(callbackFail, (error as Error).message);
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(errorMessage).toInclude(
      'Locally defined function passed to scheduleOnRN'
    );
  });

  test('throws actionable error when a locally defined named function is passed to scheduleOnRN on UI Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      try {
        scheduleOnRN(function fooFunction() {});
      } catch (error) {
        scheduleOnRN(callbackFail, (error as Error).message);
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(errorMessage).toInclude(
      'Locally defined function passed to scheduleOnRN'
    );
    expect(errorMessage).toInclude('fooFunction');
  });

  test('throws actionable error when a locally defined function is passed to scheduleOnRN on Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      try {
        scheduleOnRN(() => {});
      } catch (error) {
        scheduleOnRN(callbackFail, (error as Error).message);
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(errorMessage).toInclude(
      'Locally defined function passed to scheduleOnRN'
    );
  });

  test('throws actionable error when a locally defined named function is passed to scheduleOnRN on Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime, () => {
      'worklet';
      try {
        scheduleOnRN(function fooFunction() {});
      } catch (error) {
        scheduleOnRN(callbackFail, (error as Error).message);
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(errorMessage).toInclude(
      'Locally defined function passed to scheduleOnRN'
    );
    expect(errorMessage).toInclude('fooFunction');
  });
});
