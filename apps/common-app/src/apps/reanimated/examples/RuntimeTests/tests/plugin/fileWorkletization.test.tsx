import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';
import {
  getThree,
  implicitContextObject,
  ImplicitWorkletClass,
} from './fileWorkletization';

describe('Test file workletization', () => {
  const PASS_NOTIFICATION = 'PASS';
  let result: number | null = null;

  const callbackPass = (value: number) => {
    result = value;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    result = null;
  });

  test('Functions and methods are workletized', async () => {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(callbackPass, getThree());
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(result).toBe(3);
  });

  test('WorkletContextObjects are workletized', async () => {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(callbackPass, implicitContextObject.getFive());
    });
    await waitForNotification(PASS_NOTIFICATION);
    expect(result).toBe(5);
  });

  if (!globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('WorkletClasses are workletized', async () => {
      scheduleOnUI(() => {
        'worklet';
        scheduleOnRN(callbackPass, new ImplicitWorkletClass().getSeven());
      });
      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(7);
    });
  }
});
