import {
  runOnRuntimeSync,
  scheduleOnRN,
  scheduleOnRuntime,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const TIMER_ERROR = 'error thrown by a setTimeout callback';
const TIMER_MICROTASK_ERROR =
  'error thrown by a microtask of a setTimeout callback';
const ALIVE_NOTIFICATION = 'RUNTIME_ALIVE_AFTER_TIMER_ERROR';

describe('errors thrown by timer callbacks', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);
  const debugTest = __DEV__ ? test : test.skip;

  const onAlive = () => {
    notify(ALIVE_NOTIFICATION);
  };

  debugTest(
    'reports an error thrown by a setTimeout callback on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          setTimeout(() => {
            throw new Error(TIMER_ERROR);
          });
        });
      }).toThrow(TIMER_ERROR);

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        setTimeout(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'reports an error thrown by a microtask queued in a setTimeout callback on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          setTimeout(() => {
            queueMicrotask(() => {
              throw new Error(TIMER_MICROTASK_ERROR);
            });
          });
        });
      }).toThrow(TIMER_MICROTASK_ERROR);

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        setTimeout(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'runs the microtask checkpoint of a synchronous call after a setTimeout callback throws',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          setTimeout(() => {
            throw new Error(TIMER_ERROR);
          });
        });
      }).toThrow(TIMER_ERROR);

      runOnRuntimeSync(workletRuntime, () => {
        'worklet';
        (globalThis as Record<string, unknown>).__timerErrorsMicrotaskRan =
          false;
        queueMicrotask(() => {
          (globalThis as Record<string, unknown>).__timerErrorsMicrotaskRan =
            true;
        });
      });
      const microtaskRan = runOnRuntimeSync(workletRuntime, () => {
        'worklet';
        return (globalThis as Record<string, unknown>)
          .__timerErrorsMicrotaskRan;
      });

      expect(microtaskRan).toBe(true);
    }
  );
});
