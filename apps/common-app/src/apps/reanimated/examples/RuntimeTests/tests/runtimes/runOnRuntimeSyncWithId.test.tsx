import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  runOnRuntimeSyncWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification, beforeEach } from '../../ReJest/RuntimeTestsApi';

const PASS_NOTIFICATION = 'PASS';
const FAIL_NOTIFICATION = 'FAIL';

describe('runOnRuntimeSyncWithId', () => {
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
    // inside a test case.
    beforeEach(() => {
      value = 0;
      reason = '';
    });
  });

  test('from RN Runtime to UI Runtime', () => {
    const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('from RN Runtime to Worker Runtime', () => {
    const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('from RN Runtime to non-existing Runtime', async () => {
    const fun = () =>
      runOnRuntimeSyncWithId(9999, () => {
        'worklet';
        return 42;
      });

    await expect(fun).toThrow('[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id 9999');
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('from UI Runtime to UI Runtime', async () => {
      value = 0;
      scheduleOnUI(() => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
          'worklet';
          return 42;
        });
        scheduleOnRN(remoteFunction, result);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('from UI Runtime to Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;

        const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          return 42;
        });
        scheduleOnRN(remoteFunction, result);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('from UI Runtime to non-existing Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        try {
          const result = runOnRuntimeSyncWithId(9999, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(remoteFunction, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id 9999');
    });
  } else {
    test('from UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] runOnRuntimeSyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from UI Runtime to Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] runOnRuntimeSyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from UI Runtime to non-existing Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(9999, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] runOnRuntimeSyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });
  }

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('from Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
          'worklet';
          return 42;
        });
        scheduleOnRN(callbackPass, result);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
    test('from Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          return 42;
        });
        scheduleOnRN(callbackPass, result);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
    test('from Worker Runtime to other Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        const result = runOnRuntimeSyncWithId(workletRuntime2.runtimeId, () => {
          'worklet';
          return 42;
        });
        scheduleOnRN(callbackPass, result);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
    test('from Worker Runtime to non-existing Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(9999, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id 9999');
    });
  } else {
    test('from Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] runOnRuntimeSyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] runOnRuntimeSyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from Worker Runtime to other Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          const result = runOnRuntimeSyncWithId(workletRuntime2.runtimeId, () => {
            'worklet';
            return 42;
          });
          scheduleOnRN(callbackPass, result);
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] runOnRuntimeSyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });
  }
});
