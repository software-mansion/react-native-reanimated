import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

describe('Test recursion in worklets', () => {
  const PASS_NOTIFICATION = 'PASS';
  let result: number | null = null;

  const callbackPass = (value: number) => {
    result = value;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    result = null;
  });

  test('on Worklet runtime', async () => {
    function recursiveWorklet(a: number) {
      if (a === 2) {
        scheduleOnRN(callbackPass, a);
      } else {
        recursiveWorklet(a + 1);
      }
    }

    scheduleOnUI(recursiveWorklet, 0);
    await waitForNotification(PASS_NOTIFICATION);
    expect(result).toBe(2);
  });

  test('on React runtime', () => {
    function recursiveWorklet(a: number) {
      if (a === 2) {
        result = a;
      } else {
        recursiveWorklet(a + 1);
      }
    }

    recursiveWorklet(0);
    expect(result).toBe(2);
  });

  test('from React to Worklet runtime', async () => {
    function recursiveWorklet(a: number) {
      if (a === 2) {
        scheduleOnRN(callbackPass, a);
      } else if (a === 1) {
        scheduleOnUI(recursiveWorklet, a + 1);
      } else {
        recursiveWorklet(a + 1);
      }
    }

    recursiveWorklet(0);
    await waitForNotification(PASS_NOTIFICATION);
    expect(result).toBe(2);
  });

  test('from Worklet to React runtime', async () => {
    function recursiveWorklet(a: number) {
      if (a === 1) {
        scheduleOnRN(callbackPass, a);
      } else if (a === 2) {
        // TODO: Such case isn't supported at the moment -
        // a function can't be a Worklet and a Remote function at the same time.
        // Consider supporting it in the future.
        // scheduleOnRN(recursiveWorklet, a + 1);
      } else {
        recursiveWorklet(a + 1);
      }
    }

    scheduleOnUI(recursiveWorklet, 0);
    await waitForNotification(PASS_NOTIFICATION);
    expect(result).toBe(1);
  });
});
