import React from 'react';
import {
  isUIRuntime as ImportedComponent,
  scheduleOnRN,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  beforeEach,
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

describe('Test JSX in worklets', () => {
  const PASS_NOTIFICATION = 'PASS';
  let result = false;

  const callbackPass = (value: boolean) => {
    result = value;
    notify(PASS_NOTIFICATION);
  };

  beforeEach(() => {
    result = false;
  });

  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('worklets with JSX work on Worklet runtime', async () => {
      function renderView() {
        'worklet';
        return <ImportedComponent />;
      }

      scheduleOnUI(() => {
        'worklet';
        const element = renderView() as React.ReactElement;
        scheduleOnRN(callbackPass, typeof element.type === 'function');
      });

      await waitForNotification(PASS_NOTIFICATION);
      expect(result).toBe(true);
    });
  }
});
