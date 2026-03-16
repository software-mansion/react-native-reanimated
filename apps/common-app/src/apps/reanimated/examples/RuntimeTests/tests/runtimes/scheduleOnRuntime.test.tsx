import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnRN,
  scheduleOnUI,
  runOnRuntimeSync,
} from 'react-native-worklets';
import { beforeEach, describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

type localGlobal = typeof globalThis & {
  __notifyPass(num: number): void;
};

describe('scheduleOnRuntime', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;

  const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
  const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  test('setup beforeEach', () => {
    // TODO: there's a bug in ReJest and beforeEach has to be registered
    // inside a test case. beforeAll seems to be broken too.
    beforeEach(() => {
      value = 0;

      [workletRuntime1, workletRuntime2].forEach(runtime => {
        // TODO: fix RemoteFunction re-serialization.
        runOnRuntimeSync(runtime, () => {
          'worklet';
          (globalThis as localGlobal).__notifyPass = (num: number) => {
            'worklet';
            scheduleOnRN(callbackPass, num);
          };
        });
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

  test('schedules on UI Runtime to a Worker Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';

      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        (globalThis as localGlobal).__notifyPass(42);
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
        (globalThis as localGlobal).__notifyPass(42);
      });
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
});
