import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnRuntimeWithId,
  scheduleOnUI,
  UIRuntimeId,
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

  const workletRuntime1 = createWorkletRuntime({ name: 'test1' });
  const workletRuntime2 = createWorkletRuntime({ name: 'test2' });

  describe('from RN Runtime', () => {
    test('to UI Runtime', async () => {
      value = 0;
      scheduleOnRuntimeWithId(UIRuntimeId, () => {
        'worklet';
        scheduleOnRN(callback, 100);
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(value).toBe(100);
    });

    test('to Worker Runtime', async () => {
      scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
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
          scheduleOnRuntimeWithId(UIRuntimeId, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });

      test('to Worker Runtime', async () => {
        scheduleOnUI(() => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;

          scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
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
        scheduleOnRuntime(workletRuntime1, () => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;
          scheduleOnRuntimeWithId(UIRuntimeId, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });
      test('to self', async () => {
        scheduleOnRuntime(workletRuntime1, () => {
          'worklet';
          // @ts-expect-error TODO: fix RemoteFunction re-serialization.
          const remoteFunction = callback.__remoteFunction as typeof callback;
          scheduleOnRuntimeWithId(workletRuntime1.runtimeId, () => {
            'worklet';
            scheduleOnRN(remoteFunction, 100);
          });
        });
        await waitForNotification(PASS_NOTIFICATION);
        expect(value).toBe(100);
      });
      test('to other Worker Runtime', async () => {
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
        const fun = () =>
          scheduleOnRuntime(workletRuntime1, () => {
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
