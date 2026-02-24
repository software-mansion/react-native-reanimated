import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  runOnRuntimeSyncWithId,
  scheduleOnUI,
  UIRuntimeId,
} from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

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

  describe('from RN Runtime', () => {
    test('to UI Runtime', () => {
      const result = runOnRuntimeSyncWithId(UIRuntimeId, () => {
        'worklet';
        return 42;
      });

      expect(result).toBe(42);
    });

    test('to Worker Runtime', () => {
      const result = runOnRuntimeSyncWithId(workletRuntime1.runtimeId, () => {
        'worklet';
        return 42;
      });

      expect(result).toBe(42);
    });

    test('to non-existing Runtime', async () => {
      const fun = () =>
        runOnRuntimeSyncWithId(9999, () => {
          'worklet';
          return 42;
        });

      await expect(fun).toThrow();
    });
  });

  describe('from UI Runtime', () => {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      test('to UI Runtime', async () => {
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

      test('to Worker Runtime', async () => {
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

      test('to non-existing Runtime throws', async () => {
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
        expect(reason).toBe('[Worklets] runOnRuntimeSyncWithId: No Runtime found with id 9999');
      });
    } else {
      test('to UI Runtime throws', async () => {
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

      test('to Worker Runtime throws', async () => {
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
    }
  });

  describe('from Worker Runtime', () => {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      test('to UI Runtime', async () => {
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
      test('to self', async () => {
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
      test('to other Worker Runtime', async () => {
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
      test('to non-existing Runtime', async () => {
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
        expect(reason).toBe('[Worklets] runOnRuntimeSyncWithId: No Runtime found with id 9999');
      });
    } else {
      test('to UI Runtime throws', async () => {
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

      test('to self throws', async () => {
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

      test('to other Worker Runtime throws', async () => {
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
});
