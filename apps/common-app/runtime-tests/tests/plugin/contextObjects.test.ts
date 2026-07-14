import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';

describe('Test context objects', () => {
  const PASS_NOTIFICATION = 'PASS';
  let result: number | null = null;

  const callbackPass = (value: number) => {
    result = value;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    result = null;
  });

  if (!globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('non-context methods are workletized', async () => {
      const contextObject = {
        foo() {
          return 1;
        },
        __workletContextObject: true,
      };

      scheduleOnUI(() => {
        'worklet';
        scheduleOnRN(callbackPass, contextObject.foo());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(1);
    });

    test('non-context properties are workletized', async () => {
      const contextObject = {
        foo: () => 1,
        __workletContextObject: true,
      };

      scheduleOnUI(() => {
        'worklet';
        scheduleOnRN(callbackPass, contextObject.foo());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(1);
    });

    test('methods preserve implicit context', async () => {
      const contextObject = {
        foo() {
          return 1;
        },
        bar() {
          return this.foo() + 1;
        },
        __workletContextObject: true,
      };

      scheduleOnUI(() => {
        'worklet';
        scheduleOnRN(callbackPass, contextObject.bar());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(2);
    });

    test('methods preserve explicit context', async () => {
      const contextObject = {
        foo() {
          return 1;
        },
        bar() {
          return this.foo.call(contextObject) + 1;
        },
        __workletContextObject: true,
      };

      scheduleOnUI(() => {
        'worklet';
        scheduleOnRN(callbackPass, contextObject.bar());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(2);
    });

    test('methods change the state of the object', async () => {
      const contextObject = {
        foo: 1,
        bar() {
          this.foo += 1;
        },
        __workletContextObject: true,
      };

      scheduleOnUI(() => {
        'worklet';
        contextObject.bar();
        scheduleOnRN(callbackPass, contextObject.foo);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(2);
    });

    test("the object doesn't persist in memory", async () => {
      const FIRST_NOTIFICATION = 'FIRST';
      const SECOND_NOTIFICATION = 'SECOND';
      const results: number[] = [];

      const callback = (notificationName: string, value: number) => {
        results.push(value);
        notify(notificationName);
      };

      const scheduleIncrement = (notificationName: string) => {
        const contextObject = {
          foo: 1,
          bar() {
            this.foo += 1;
          },
          __workletContextObject: true,
        };

        scheduleOnUI(() => {
          'worklet';
          contextObject.bar();
          scheduleOnRN(callback, notificationName, contextObject.foo);
        });
      };

      scheduleIncrement(FIRST_NOTIFICATION);
      await waitForNotification(FIRST_NOTIFICATION);
      expect(results[0]).toBe(2);

      scheduleIncrement(SECOND_NOTIFICATION);
      await waitForNotification(SECOND_NOTIFICATION);
      expect(results[1]).toBe(2);
    });
  }
});
