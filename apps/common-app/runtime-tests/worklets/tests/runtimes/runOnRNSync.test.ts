import {
  getCurrentThreadId,
  isBundleModeEnabled,
  runOnRNSync,
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

describe('runOnRNSync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value: number | string | undefined;
  let errorMessage = '';
  let counter = 0;
  let callerThreadId = '';
  let rnThreadId = '';

  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const callbackPass = (result: number | string, threadId: string) => {
    value = result;
    callerThreadId = threadId;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (message: string, threadId: string) => {
    errorMessage = message;
    callerThreadId = threadId;
    notify(FAIL_NOTIFICATION);
  };

  const add = (a: number, b: number) => {
    rnThreadId = getCurrentThreadId();
    return a + b;
  };

  const getRuntimeKind = () => {
    rnThreadId = getCurrentThreadId();
    return globalThis.__RUNTIME_KIND;
  };

  const makeObject = () => {
    rnThreadId = getCurrentThreadId();
    return { a: 1, b: [2, 3], c: { d: 'e' } };
  };

  const increment = () => {
    rnThreadId = getCurrentThreadId();
    return ++counter;
  };

  const throwError = () => {
    rnThreadId = getCurrentThreadId();
    throw new Error('Error thrown on the RN Runtime');
  };

  const workletSources = [
    {
      name: 'UI',
      scheduleOnTarget: scheduleOnUI,
    },
    {
      name: 'Worker',
      scheduleOnTarget: (
        fn: (...args: unknown[]) => void,
        ...args: unknown[]
      ) => scheduleOnRuntime(workletRuntime, fn, ...args),
    },
  ];

  beforeEach(() => {
    value = undefined;
    errorMessage = '';
    counter = 0;
    callerThreadId = '';
    rnThreadId = '';
  });

  test('calls the function directly on the RN Runtime', () => {
    expect(runOnRNSync(add, 20, 22)).toBe(42);
    expect(rnThreadId).toBe(getCurrentThreadId());
  });

  if (isBundleModeEnabled()) {
    workletSources.forEach(({ name, scheduleOnTarget }) => {
      test(`returns the result of a remote function from ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          scheduleOnRN(
            callbackPass,
            runOnRNSync(add, 20, 22),
            getCurrentThreadId()
          );
        });

        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(42);
        expect(rnThreadId).toBe(callerThreadId);
      });

      test(`runs a remote function on the RN Runtime from ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          scheduleOnRN(
            callbackPass,
            runOnRNSync(getRuntimeKind),
            getCurrentThreadId()
          );
        });

        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(1);
        expect(rnThreadId).toBe(callerThreadId);
      });

      test(`runs a worklet on the RN Runtime from ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          const [runtimeKind, threadId] = runOnRNSync(() => {
            'worklet';
            return [globalThis.__RUNTIME_KIND, getCurrentThreadId()];
          });
          scheduleOnRN(
            callbackPass,
            runtimeKind,
            threadId === getCurrentThreadId() ? 'same' : 'different'
          );
        });

        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(1);
        expect(callerThreadId).toBe('same');
      });

      test(`returns an object from ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          scheduleOnRN(
            callbackPass,
            JSON.stringify(runOnRNSync(makeObject)),
            getCurrentThreadId()
          );
        });

        await waitForNotification(PASS_NOTIFICATION);
        expect(rnThreadId).toBe(callerThreadId);
        expect(value).toBe(JSON.stringify(makeObject()));
      });

      test(`sees RN Runtime state synchronously from ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          const first = runOnRNSync(increment);
          const second = runOnRNSync(increment);
          scheduleOnRN(
            callbackPass,
            JSON.stringify([first, second]),
            getCurrentThreadId()
          );
        });

        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(JSON.stringify([1, 2]));
        expect(rnThreadId).toBe(callerThreadId);
      });

      test(`rethrows an error from the RN Runtime on ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          try {
            runOnRNSync(throwError);
          } catch (error) {
            scheduleOnRN(
              callbackFail,
              (error as Error).message,
              getCurrentThreadId()
            );
          }
        });

        await waitForNotification(FAIL_NOTIFICATION);
        expect(errorMessage).toInclude('Error thrown on the RN Runtime');
        expect(rnThreadId).toBe(callerThreadId);
      });

      test(`throws when a locally defined function is passed on ${name} Runtime`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          try {
            runOnRNSync(() => 42);
          } catch (error) {
            scheduleOnRN(
              callbackFail,
              (error as Error).message,
              getCurrentThreadId()
            );
          }
        });

        await waitForNotification(FAIL_NOTIFICATION);
        expect(errorMessage).toInclude(
          'Locally defined function passed to runOnRNSync'
        );
      });
    });

    test('runs on the RN Runtime from runOnUISync without a deadlock', () => {
      const result = runOnUISync(() => {
        'worklet';
        return runOnRNSync(add, 20, 22);
      });

      expect(result).toBe(42);
      expect(rnThreadId).toBe(getCurrentThreadId());
    });
  } else if (__DEV__) {
    workletSources.forEach(({ name, scheduleOnTarget }) => {
      test(`throws on ${name} Runtime outside of the Bundle Mode`, async () => {
        scheduleOnTarget(() => {
          'worklet';
          try {
            runOnRNSync(add, 20, 22);
          } catch (error) {
            scheduleOnRN(
              callbackFail,
              error instanceof Error ? error.message : String(error),
              getCurrentThreadId()
            );
          }
        });

        await waitForNotification(FAIL_NOTIFICATION);
        expect(errorMessage).toBe(
          '[Worklets] runOnRNSync cannot be called on Worklet Runtimes outside of the Bundle Mode.'
        );
      });
    });
  }
});
