/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  runOnUIAsync,
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
} from '../../ReJest/RuntimeTestsApi';

describe('runOnUIAsync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

  const workletRuntime = getWorkletRuntimeFromPool('test');

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (rea: string) => {
    reason = rea;
    notify(FAIL_NOTIFICATION);
  };

  beforeEach(() => {
    value = 0;
    reason = '';
  });

  test('schedules on RN Runtime to UI Runtime', async () => {
    const result = await runOnUIAsync(() => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('rejects when scheduling on RN Runtime to UI Runtime with error', async () => {
    try {
      await runOnUIAsync(() => {
        'worklet';
        throw new Error('test error');
      });
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }

    expect(reason).toBe('test error');
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('schedules on UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnUIAsync(() => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling on UI Runtime to UI Runtime with error', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnUIAsync(() => {
          'worklet';
          throw new Error('test error');
        })
          .then((result) => {
            scheduleOnRN(callbackPass, result);
          })
          .catch((error: unknown) => {
            scheduleOnRN(
              callbackFail,
              error instanceof Error ? error.message : String(error)
            );
          });
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('test error');
    });

    test('schedules on Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        runOnUIAsync(() => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling on Worker Runtime to UI Runtime with error', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        runOnUIAsync(() => {
          'worklet';
          throw new Error('test error');
        })
          .then((result) => {
            scheduleOnRN(callbackPass, result);
          })
          .catch((error: unknown) => {
            scheduleOnRN(
              callbackFail,
              error instanceof Error ? error.message : String(error)
            );
          });
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('test error');
    });
  } else if (__DEV__) {
    test('throws when scheduling on UI Runtime to UI Runtime without worklets bundle mode enabled', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnUIAsync(() => {
            'worklet';
            return 42;
          });
        } catch (error) {
          scheduleOnRN(
            callbackFail,
            error instanceof Error ? error.message : String(error)
          );
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toInclude(
        '[Worklets] runOnUIAsync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });

    test('throws when scheduling on Worker Runtime to UI Runtime without worklets bundle mode enabled', async () => {
      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        try {
          runOnUIAsync(() => {
            'worklet';
            return 42;
          });
        } catch (error) {
          scheduleOnRN(
            callbackFail,
            error instanceof Error ? error.message : String(error)
          );
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toInclude(
        '[Worklets] runOnUIAsync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
      );
    });
  }
});
