import {
  experimental_runOnRNSync,
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

describe('experimental_runOnRNSync', () => {
  const PASS_NOTIFICATION = 'PASS';
  const FAIL_NOTIFICATION = 'FAIL';
  let value: number | string | undefined;
  let errorMessage = '';
  let counter = 0;

  const [workletRuntime] = getWorkletRuntimesFromPool(1);

  const callbackPass = (result: number | string) => {
    value = result;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (message: string) => {
    errorMessage = message;
    notify(FAIL_NOTIFICATION);
  };

  const add = (a: number, b: number) => a + b;

  const getRuntimeKind = () => globalThis.__RUNTIME_KIND;

  const makeObject = () => ({ a: 1, b: [2, 3], c: { d: 'e' } });

  const increment = () => ++counter;

  const throwError = () => {
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
  });

  workletSources.forEach(({ name, scheduleOnTarget }) => {
    test(`returns the result of a remote function from ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        scheduleOnRN(callbackPass, experimental_runOnRNSync(add, 20, 22));
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });

    test(`runs a remote function on the RN Runtime from ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        scheduleOnRN(callbackPass, experimental_runOnRNSync(getRuntimeKind));
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(1);
    });

    test(`runs a worklet on the RN Runtime from ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        const result = experimental_runOnRNSync(() => {
          'worklet';
          return globalThis.__RUNTIME_KIND;
        });
        scheduleOnRN(callbackPass, result);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(1);
    });

    test(`returns an object from ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        scheduleOnRN(
          callbackPass,
          JSON.stringify(experimental_runOnRNSync(makeObject))
        );
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(JSON.stringify(makeObject()));
    });

    test(`sees RN Runtime state synchronously from ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        const first = experimental_runOnRNSync(increment);
        const second = experimental_runOnRNSync(increment);
        scheduleOnRN(callbackPass, JSON.stringify([first, second]));
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(JSON.stringify([1, 2]));
    });

    test(`rethrows an error from the RN Runtime on ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        try {
          experimental_runOnRNSync(throwError);
        } catch (error) {
          scheduleOnRN(callbackFail, (error as Error).message);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(errorMessage).toInclude('Error thrown on the RN Runtime');
    });

    test(`throws when a locally defined function is passed on ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        try {
          experimental_runOnRNSync(() => 42);
        } catch (error) {
          scheduleOnRN(callbackFail, (error as Error).message);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(errorMessage).toInclude(
        'Locally defined function passed to experimental_runOnRNSync'
      );
    });
  });

  test('calls the function directly on the RN Runtime', () => {
    expect(experimental_runOnRNSync(add, 20, 22)).toBe(42);
  });

  test('runs on the RN Runtime from runOnUISync without a deadlock', () => {
    const result = runOnUISync(() => {
      'worklet';
      return experimental_runOnRNSync(add, 20, 22);
    });

    expect(result).toBe(42);
  });
});
