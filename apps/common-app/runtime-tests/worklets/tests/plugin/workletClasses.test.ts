import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

class WorkletClass {
  __workletClass = true;
  value = 0;
  getOne() {
    return 1;
  }

  getTwo() {
    return this.getOne() + 1;
  }

  getIncremented() {
    return ++this.value;
  }
}

interface ITypeScriptClass {
  getOne(): number;
  getTwo(): number;
  getIncremented(): number;
}

class TypeScriptClass implements ITypeScriptClass {
  __workletClass: boolean = true;
  value: number = 0;
  getOne(): number {
    return 1;
  }

  getTwo(): number {
    return this.getOne() + 1;
  }

  getIncremented(): number {
    return ++this.value;
  }
}

describe('Test worklet classes', () => {
  const PASS_NOTIFICATION = 'PASS';
  let result: number | boolean | null = null;

  const callbackPass = (value: number | boolean) => {
    result = value;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    result = null;
  });

  if (!globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('class works on React runtime', () => {
      const clazz = new WorkletClass();
      const value =
        clazz.getTwo() + clazz.getIncremented() + clazz.getIncremented();
      expect(value).toBe(5);
    });

    test('constructor works on Worklet runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        const clazz = new WorkletClass();
        clazz.getOne();
        scheduleOnRN(callbackPass, 0);
      });
      await waitForNotification(PASS_NOTIFICATION);
    });

    test('class methods work on Worklet runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        const clazz = new WorkletClass();
        scheduleOnRN(callbackPass, clazz.getOne());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(1);
    });

    test('class instance methods preserve binding', async () => {
      scheduleOnUI(() => {
        'worklet';
        const clazz = new WorkletClass();
        scheduleOnRN(callbackPass, clazz.getTwo());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(2);
    });

    test('class instances preserve state', async () => {
      scheduleOnUI(() => {
        'worklet';
        const clazz = new WorkletClass();
        scheduleOnRN(
          callbackPass,
          clazz.getIncremented() + clazz.getIncremented()
        );
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(3);
    });

    test('instanceof operator works on Worklet runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        const clazz = new WorkletClass();
        scheduleOnRN(callbackPass, clazz instanceof WorkletClass);
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(true);
    });

    test('TypeScript classes work on Worklet runtime', async () => {
      scheduleOnUI(() => {
        'worklet';
        const clazz = new TypeScriptClass();
        scheduleOnRN(callbackPass, clazz.getOne());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(1);
    });
  }

  // TODO: Add a test that throws when class is sent from React to Worklet runtime.
  // TODO: Add a test that throws when trying to use Worklet Class with inheritance.
});
