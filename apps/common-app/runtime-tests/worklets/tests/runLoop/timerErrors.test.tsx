import { scheduleOnRN, scheduleOnRuntime } from 'react-native-worklets';

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
const INTERVAL_ERROR = 'error thrown by a setInterval callback';
const FRAME_ERROR = 'error thrown by a requestAnimationFrame callback';
const FRAME_CANCEL_ERROR =
  'error thrown by a requestAnimationFrame callback that cancels another one';
const CANCELLED_CALLBACK_NOTIFICATION = 'CANCELLED_FRAME_CALLBACK_RESULT';
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
    'keeps firing a setInterval whose callback throws on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          let calls = 0;
          const intervalId = setInterval(() => {
            calls++;
            if (calls === 1) {
              throw new Error(INTERVAL_ERROR);
            }
            if (calls === 3) {
              clearInterval(intervalId);
              scheduleOnRN(onAlive);
            }
          }, 10);
        });
      }).toThrow(INTERVAL_ERROR);

      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'runs the other requestAnimationFrame callbacks of a frame when one throws on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          requestAnimationFrame(() => {
            throw new Error(FRAME_ERROR);
          });
          requestAnimationFrame(() => {
            scheduleOnRN(onAlive);
          });
        });
      }).toThrow(FRAME_ERROR);

      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'runs the microtasks of a throwing requestAnimationFrame callback before the next callback of the frame on a Worker Runtime',
    async () => {
      let cancelledCallbackRan: boolean | null = null;
      const onResult = (ran: boolean) => {
        cancelledCallbackRan = ran;
        notify(CANCELLED_CALLBACK_NOTIFICATION);
      };

      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          let ran = false;
          requestAnimationFrame(() => {
            queueMicrotask(() => {
              cancelAnimationFrame(cancelledHandle);
            });
            throw new Error(FRAME_CANCEL_ERROR);
          });
          const cancelledHandle = requestAnimationFrame(() => {
            ran = true;
          });
          requestAnimationFrame(() => {
            scheduleOnRN(onResult, ran);
          });
        });
      }).toThrow(FRAME_CANCEL_ERROR);

      await waitForNotification(CANCELLED_CALLBACK_NOTIFICATION);
      expect(cancelledCallbackRan).toBe(false);
    }
  );
});
