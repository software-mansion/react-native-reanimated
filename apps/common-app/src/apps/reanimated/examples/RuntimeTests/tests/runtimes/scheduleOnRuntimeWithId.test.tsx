import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification, beforeEach } from '../../ReJest/RuntimeTestsApi';

const PASS_NOTIFICATION = 'PASS';
const FAIL_NOTIFICATION = 'FAIL';

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
    // inside a test case.
    beforeEach(() => {
      value = 0;
      reason = '';
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

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('from UI Runtime to UI Runtime', async () => {
      value = 0;
      scheduleOnUI(() => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        scheduleOnRuntimeWithId(UIRuntimeId, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('from UI Runtime to Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;

        scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
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
          scheduleOnRuntimeWithId(9999, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999');
    });
  } else {
    test('from UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          scheduleOnRuntimeWithId(UIRuntimeId, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from UI Runtime to Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });
  }

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('from Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        scheduleOnRuntimeWithId(UIRuntimeId, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
    test('from Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
    test('from Worker Runtime to other Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        scheduleOnRuntimeWithId(workletRuntime2.runtimeId, () => {
          'worklet';
          scheduleOnRN(remoteFunction, 42);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
    test('from Worker Runtime to non-existing Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        // @ts-expect-error TODO: fix RemoteFunction re-serialization.
        const remoteFunction = callbackPass.__remoteFunction as typeof callbackPass;
        try {
          scheduleOnRuntimeWithId(9999, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999');
    });
  } else {
    test('from Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          scheduleOnRuntimeWithId(UIRuntimeId, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });

    test('from Worker Runtime to other Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          scheduleOnRuntimeWithId(workletRuntime2.runtimeId, () => {
            'worklet';
            scheduleOnRN(callbackPass, 42);
          });
        } catch (error) {
          scheduleOnRN(callbackFail, error instanceof Error ? error.message : String(error));
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId cannot be called on Worklet Runtimes outside of the Bundle Mode.',
      );
    });
  }
});
