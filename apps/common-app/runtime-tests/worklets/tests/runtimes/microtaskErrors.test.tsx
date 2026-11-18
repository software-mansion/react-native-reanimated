import {
  runOnUISync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const UI_ERROR = 'microtask error on the UI Runtime';
const WORKER_ERROR = 'microtask error on a Worker Runtime';
const SYNC_CALL_ERROR = 'microtask error in a synchronous call';
const ALIVE_NOTIFICATION = 'RUNTIME_ALIVE_AFTER_MICROTASK_ERROR';

describe('errors thrown by microtasks', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);
  const debugTest = __DEV__ ? test : test.skip;

  const onAlive = () => {
    notify(ALIVE_NOTIFICATION);
  };

  debugTest(
    'reports an error thrown at the checkpoint of a worklet scheduled on the UI Runtime',
    async () => {
      await expect(() => {
        scheduleOnUI(() => {
          'worklet';
          queueMicrotask(() => {
            throw new Error(UI_ERROR);
          });
        });
      }).toThrow(UI_ERROR);

      scheduleOnUI(() => {
        'worklet';
        queueMicrotask(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'reports an error thrown at the checkpoint of a synchronous call into the UI Runtime',
    async () => {
      await expect(() => {
        runOnUISync(() => {
          'worklet';
          queueMicrotask(() => {
            throw new Error(SYNC_CALL_ERROR);
          });
        });
      }).toThrow(SYNC_CALL_ERROR);

      scheduleOnUI(() => {
        'worklet';
        queueMicrotask(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'reports an error thrown at the checkpoint of a worklet scheduled on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          queueMicrotask(() => {
            throw new Error(WORKER_ERROR);
          });
        });
      }).toThrow(WORKER_ERROR);

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        queueMicrotask(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );
});
