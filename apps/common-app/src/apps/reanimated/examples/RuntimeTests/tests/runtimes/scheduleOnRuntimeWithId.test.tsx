import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeID,
} from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

const PASS_NOTIFICATION = 'PASS';
const FAIL_NOTIFICATION = 'FAIL';

describe('scheduleOnRuntimeWithId', () => {
  let value = 0;

  const callback = (num: number) => {
    value = num;
    notify(PASS_NOTIFICATION);
  };

  const callbackFail = () => {
    notify(FAIL_NOTIFICATION);
  };

  describe('from RN Runtime', () => {
    test('to UI Runtime', async () => {
      value = 0;
      scheduleOnRuntimeWithId(UIRuntimeID, () => {
        'worklet';
        scheduleOnRN(callback, 100);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(100);
    });

    test('to Worker Runtime', async () => {
      const workletRuntime = createWorkletRuntime({ name: 'test' });
      scheduleOnRuntimeWithId(workletRuntime.runtimeId, () => {
        'worklet';
        scheduleOnRN(callback, 100);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(100);
    });

    test('to non-existing Runtime', async () => {
      const fun = () =>
        scheduleOnRuntimeWithId(9999, () => {
          'worklet';
          scheduleOnRN(callback, 100);
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
          const remoteFunction = callback.__remoteFunction as typeof callback;
          scheduleOnRuntimeWithId(UIRuntimeID, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });

      test('to Worker Runtime', async () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        scheduleOnUI(() => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;

          scheduleOnRuntimeWithId(workletRuntime.runtimeId, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });

      test('to non-existing Runtime', async () => {
        const fun = () =>
          scheduleOnUI(() => {
            'worklet';
            // @ts-expect-error TODO: fix RemoteFunction re-serialization.
            const remoteFunction = callback.__remoteFunction as typeof callback;
            try {
              scheduleOnRuntimeWithId(9999, () => {
                'worklet';
                scheduleOnRN(remoteFunction, 100);
              });
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_) {
              scheduleOnRN(callbackFail);
            }
          });

        fun();
        await waitForNotification(FAIL_NOTIFICATION);
      });
    }
  });

  describe('from Worker Runtime', () => {
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      test('to UI Runtime', async () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;
          scheduleOnRuntimeWithId(UIRuntimeID, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });
      test('to self', async () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;
          scheduleOnRuntimeWithId(workletRuntime.runtimeId, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });
      test('to other Worker Runtime', async () => {
        const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
        const workletRuntime2 = createWorkletRuntime({ name: 'test2' });
        scheduleOnRuntime(workletRuntime1, () => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;
          scheduleOnRuntimeWithId(workletRuntime2.runtimeId, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });
      test('to non-existing Runtime', async () => {
        const workletRuntime = createWorkletRuntime({ name: 'test' });
        const fun = () =>
          scheduleOnRuntime(workletRuntime, () => {
            'worklet';
            // @ts-expect-error TODO: fix RemoteFunction re-serialization.
            const remoteFunction = callback.__remoteFunction as typeof callback;
            try {
              scheduleOnRuntimeWithId(9999, () => {
                'worklet';
                scheduleOnRN(remoteFunction, 100);
              });
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
              scheduleOnRN(callbackFail);
            }
          });
        fun();
        await waitForNotification(FAIL_NOTIFICATION);
      });
    }
  });
});
