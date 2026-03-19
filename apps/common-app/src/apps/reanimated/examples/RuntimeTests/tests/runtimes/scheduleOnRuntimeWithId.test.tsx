import {
  createWorkletRuntime,
  runOnRuntimeSyncWithId,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification, beforeEach } from '../../ReJest/RuntimeTestsApi';

const PASS_NOTIFICATION = 'PASS';
const FAIL_NOTIFICATION = 'FAIL';

type localGlobal = typeof globalThis & {
  scheduleOnRN: typeof scheduleOnRN;
};

describe('scheduleOnRuntimeWithId', () => {
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

  const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
  const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

  test('setup beforeEach', () => {
    // TODO: there's a bug in ReJest and beforeEach has to be registered
    // inside a test case. beforeAll seems to be broken too.
    beforeEach(() => {
      value = 0;
      reason = '';

      [UIRuntimeId, workletRuntime1.runtimeId, workletRuntime2.runtimeId].forEach(runtimeId => {
        runOnRuntimeSyncWithId(runtimeId, () => {
          'worklet';
          // TODO: fix worklet re-serialization outside of Bundle Mode
          (globalThis as localGlobal).scheduleOnRN = scheduleOnRN;
        });
      });
    });
  });

  test('from RN Runtime to UI Runtime', async () => {
    value = 0;
    scheduleOnRuntimeWithId(UIRuntimeId, () => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('from RN Runtime to Worker Runtime', async () => {
    scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
      'worklet';
      scheduleOnRN(callbackPass, 42);
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('from RN Runtime to non-existing Runtime', async () => {
    const fun = () =>
      scheduleOnRuntimeWithId(9999, () => {
        'worklet';
        scheduleOnRN(callbackPass, 42);
      });

    await expect(fun).toThrow('[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999');
  });

  test('from UI Runtime to UI Runtime', async () => {
    value = 0;
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRuntimeWithId(UIRuntimeId, () => {
        'worklet';
        (globalThis as localGlobal).scheduleOnRN(callbackPass, 42);
      });
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('from UI Runtime to Worker Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
        'worklet';
        (globalThis as localGlobal).scheduleOnRN(callbackPass, 42);
      });
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  test('from UI Runtime to non-existing Runtime', async () => {
    scheduleOnUI(() => {
      'worklet';
      try {
        scheduleOnRuntimeWithId(9999, () => {
          'worklet';
          scheduleOnRN(callbackPass, 42);
        });
      } catch (error) {
        scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(reason).toBe('[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999');
  });

  test('from Worker Runtime to UI Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      scheduleOnRuntimeWithId(UIRuntimeId, () => {
        'worklet';
        (globalThis as localGlobal).scheduleOnRN(callbackPass, 42);
      });
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
  test('from Worker Runtime to self', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
        'worklet';
        (globalThis as localGlobal).scheduleOnRN(callbackPass, 42);
      });
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
  test('from Worker Runtime to other Worker Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      scheduleOnRuntimeWithId(workletRuntime2.runtimeId, () => {
        'worklet';
        (globalThis as localGlobal).scheduleOnRN(callbackPass, 42);
      });
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });
  test('from Worker Runtime to non-existing Runtime', async () => {
    scheduleOnRuntime(workletRuntime1, () => {
      'worklet';
      try {
        scheduleOnRuntimeWithId(9999, () => {
          'worklet';
          (globalThis as localGlobal).scheduleOnRN(callbackPass, 42);
        });
      } catch (error) {
        scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
      }
    });

    await waitForNotification(FAIL_NOTIFICATION);
    expect(reason).toBe('[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999');
  });
});
