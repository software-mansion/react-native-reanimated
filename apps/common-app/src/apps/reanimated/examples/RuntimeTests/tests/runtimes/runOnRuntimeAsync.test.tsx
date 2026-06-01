/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  runOnRuntimeAsync,
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

describe('runOnRuntimeAsync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value = 0;
  let reason = '';

  const workletRuntime1 = getWorkletRuntimeFromPool('test');
  const workletRuntime2 = getWorkletRuntimeFromPool('test2');

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

  test('schedules on RN Runtime to a Worker Runtime', async () => {
    const result = await runOnRuntimeAsync(workletRuntime1, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('rejects when scheduling on RN Runtime to a Worker Runtime with error', async () => {
    try {
      await runOnRuntimeAsync(workletRuntime1, () => {
        'worklet';
        throw new Error('test error');
      });
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }

    expect(reason).toBe('test error');
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('schedules on UI Runtime to a Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsync(workletRuntime1, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling on UI Runtime to a Worker Runtime with error', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsync(workletRuntime1, () => {
          'worklet';
          throw new Error('test error');
        }).catch((error) => {
          scheduleOnRN(
            callbackFail,
            error instanceof Error ? error.message : String(error)
          );
        });
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('test error');
    });

    test('schedules on Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsync(workletRuntime1, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling on Worker Runtime to self with error', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsync(workletRuntime1, () => {
          'worklet';
          throw new Error('test error');
        }).catch((error) => {
          scheduleOnRN(
            callbackFail,
            error instanceof Error ? error.message : String(error)
          );
        });
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toBe('test error');
    });

    test('schedules on Worker Runtime to another Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsync(workletRuntime2, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling on Worker Runtime to another Worker Runtime with error', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsync(workletRuntime2, () => {
          'worklet';
          throw new Error('test error');
        }).catch((error) => {
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
    test('throws when scheduling on UI Runtime to a Worker Runtime ', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnRuntimeAsync(workletRuntime1, () => {
            'worklet';
            return 42;
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          scheduleOnRN(callbackFail, reason);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toInclude(
        'runOnRuntimeAsync cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling on Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeAsync(workletRuntime1, () => {
            'worklet';
            return 42;
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          scheduleOnRN(callbackFail, reason);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toInclude(
        'runOnRuntimeAsync cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling on Worker Runtime to another Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeAsync(workletRuntime2, () => {
            'worklet';
            return 42;
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          scheduleOnRN(callbackFail, reason);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(reason).toInclude(
        'runOnRuntimeAsync cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });
  }
});
