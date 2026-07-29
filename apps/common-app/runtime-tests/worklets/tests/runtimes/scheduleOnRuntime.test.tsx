import {
  scheduleOnRuntime,
  scheduleOnRN,
  scheduleOnUI,
  runOnRuntimeSync,
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

describe('scheduleOnRuntime', () => {
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

    [workletRuntime1, workletRuntime2].forEach((runtime) => {
      runOnRuntimeSync(runtime, () => {
        'worklet';
        // TODO: fix worklet re-serialization outside of Bundle Mode
        globalThis.scheduleOnRN = scheduleOnRN;
      });
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

  test('drains microtasks after execution', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      queueMicrotask(() => {
        scheduleOnRN(callbackPass, 42);
      });
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('drains microtasks exactly once after execution', async () => {
    startCountingMicrotaskDrains(workletRuntime1.runtimeId);

    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });
    await waitForNotification(PASS_NOTIFICATION);

    const microtaskDrainCount = stopCountingMicrotaskDrains(
      workletRuntime1.runtimeId
    );

    // The counter setup and the tested execution each drain once.
    expect(microtaskDrainCount).toBe(2);
  });

  test('schedules on UI Runtime to a Worker Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';

      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        globalThis.scheduleOnRN(callbackPass, 42);
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
        globalThis.scheduleOnRN(callbackPass, 42);
      });
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
});
