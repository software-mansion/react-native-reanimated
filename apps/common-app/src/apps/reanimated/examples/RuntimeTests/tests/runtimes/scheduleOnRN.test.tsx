import {
  scheduleOnRuntime,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';
import {
  describe,
  expect,
  getWorkletRuntimeFromPool,
  notify,
  test,
  waitForNotification,
  beforeEach,
} from '../../ReJest/RuntimeTestsApi';

describe('scheduleOnRN', () => {
  const PASS_NOTIFICATION = 'PASS';
  let value = 0;
  const FAIL_NOTIFICATION = 'FAIL';
  let errorMessage = '';

  const workletRuntime = getWorkletRuntimeFromPool('test');

  const callbackPass = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = (message: string) => {
    errorMessage = message;
    notify(FAIL_NOTIFICATION);
  };

  const rnSource = {
    name: 'RN',
    scheduleOnTarget: (fn: (...args: unknown[]) => void, ...args: unknown[]) =>
      fn(...args),
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

  const allSources = [rnSource, ...workletSources];

  beforeEach(() => {
    value = 0;
    errorMessage = '';
  });

  allSources.forEach(({ name, scheduleOnTarget }) => {
    test(`schedules remoteFunction from ${name} Runtime to RN Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        scheduleOnRN(callbackPass, 42);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    });
  });

  allSources.forEach(({ name, scheduleOnTarget }) =>
    test(`schedules hostFunction from ${name} Runtime to RN Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        const hostFunction = globalThis.__workletsModuleProxy
          .createSerializableBoolean as (value: boolean) => void;
        scheduleOnRN(hostFunction, true);
        scheduleOnRN(callbackPass, 42);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(42);
    })
  );

  test('schedules locally defined function from RN Runtime to RN Runtime without errors', async () => {
    scheduleOnRN(() => {
      scheduleOnRN(() => callbackPass(42));
    });

    await waitForNotification(PASS_NOTIFICATION);
    expect(value).toBe(42);
  });

  workletSources.forEach(({ name, scheduleOnTarget }) =>
    test(`throws actionable error when a locally defined anonymous function is passed to scheduleOnRN on ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        try {
          scheduleOnRN(() => {});
        } catch (error) {
          scheduleOnRN(callbackFail, (error as Error).message);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(errorMessage).toInclude(
        'Locally defined function passed to scheduleOnRN'
      );
    })
  );

  workletSources.forEach(({ name, scheduleOnTarget }) =>
    test(`throws actionable error when a locally defined named function is passed to scheduleOnRN on ${name} Runtime`, async () => {
      scheduleOnTarget(() => {
        'worklet';
        try {
          scheduleOnRN(function fooFunction() {});
        } catch (error) {
          scheduleOnRN(callbackFail, (error as Error).message);
        }
      });

      await waitForNotification(FAIL_NOTIFICATION);
      expect(errorMessage).toInclude(
        'Locally defined function passed to scheduleOnRN'
      );
      expect(errorMessage).toInclude('fooFunction');
    })
  );
});
