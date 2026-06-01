/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  runOnRuntimeAsyncWithId,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
  UIRuntimeId,
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

const PASS_NOTIFICATION = 'PASS';
const FAIL_NOTIFICATION = 'FAIL';

describe('runOnRuntimeAsyncWithId', () => {
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

  const workletRuntime1 = getWorkletRuntimeFromPool('test');
  const workletRuntime2 = getWorkletRuntimeFromPool('test2');

  beforeEach(() => {
    value = 0;
    reason = '';
  });

  test('schedules from RN Runtime to UI Runtime', async () => {
    const result = await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
      'worklet';
      return 42;
    });

    expect(result).toBe(42);
  });

  test('rejects when scheduling from RN Runtime to UI Runtime with error', async () => {
    try {
      await runOnRuntimeAsyncWithId(UIRuntimeId, () => {
        'worklet';
        throw new Error('test error');
      });
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }

    expect(reason).toBe('test error');
  });

  test('schedules from RN Runtime to Worker Runtime', async () => {
    const result = await runOnRuntimeAsyncWithId(
      workletRuntime1.runtimeId,
      () => {
        'worklet';
        return 42;
      }
    );

    expect(result).toBe(42);
  });

  test('rejects when scheduling from RN Runtime to Worker Runtime with error', async () => {
    try {
      await runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
        'worklet';
        throw new Error('test error');
      });
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }

    expect(reason).toBe('test error');
  });

  test('throws when scheduling from RN Runtime to non-existing Runtime', async () => {
    const fun = () =>
      runOnRuntimeAsyncWithId(9999, () => {
        'worklet';
        return 42;
      });

    await expect(fun).toThrow(
      '[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999'
    );
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('schedules from UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsyncWithId(UIRuntimeId, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling from UI Runtime to UI Runtime with error', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsyncWithId(UIRuntimeId, () => {
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

    test('throws when scheduling from UI Runtime to non-existing Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsyncWithId(9999, () => {
          'worklet';
          return 42;
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
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999'
      );
    });

    test('schedules from UI Runtime to Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling from UI Runtime to Worker Runtime with error', async () => {
      scheduleOnUI(() => {
        'worklet';
        runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
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

    test('schedules from Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(UIRuntimeId, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling from Worker Runtime to UI Runtime with error', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(UIRuntimeId, () => {
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

    test('schedules from Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling from Worker Runtime to self with error', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
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

    test('schedules from Worker Runtime to other Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(workletRuntime2.runtimeId, () => {
          'worklet';
          return 42;
        }).then((result) => {
          scheduleOnRN(callbackPass, result);
        });
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test('rejects when scheduling from Worker Runtime to other Worker Runtime with error', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(workletRuntime2.runtimeId, () => {
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

    test('from Worker Runtime to non-existing Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        runOnRuntimeAsyncWithId(9999, () => {
          'worklet';
          return 42;
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
      expect(reason).toBe(
        '[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id 9999'
      );
    });
  } else if (__DEV__) {
    test('throws when scheduling from UI Runtime to UI Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(UIRuntimeId, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling from UI Runtime to Worker Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling from UI Runtime to non-existing Runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(9999, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling from Worker Runtime to UI Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(UIRuntimeId, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling from Worker Runtime to self', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(workletRuntime1.runtimeId, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling from Worker Runtime to other Worker Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(workletRuntime2.runtimeId, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });

    test('throws when scheduling from Worker Runtime to non-existing Runtime', async () => {
      scheduleOnRuntime(workletRuntime1, () => {
        'worklet';
        try {
          runOnRuntimeAsyncWithId(9999, () => {
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
        'runOnRuntimeAsyncWithId cannot be called on Worklet Runtimes outside of the Bundle Mode'
      );
    });
  }
});
