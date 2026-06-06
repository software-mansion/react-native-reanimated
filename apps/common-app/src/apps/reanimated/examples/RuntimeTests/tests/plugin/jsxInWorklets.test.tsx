import React, { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import {
  describe,
  expect,
  getRegisteredValue,
  registerValue,
  render,
  test,
  wait,
} from '../../ReJest/RuntimeTestsApi';
import {
  isUIRuntime as ImportedComponent,
  scheduleOnUI,
} from 'react-native-worklets';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Test JSX in worklets', () => {
  if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
    test('worklets with JSX work on Worklet runtime', async () => {
      const ExampleComponent = () => {
        const output = useSharedValue(false);
        registerValue(SHARED_VALUE_REF, output);

        function renderView() {
          'worklet';
          // @ts-expect-error Uses an imported function as JSX to check capture.
          return <ImportedComponent />;
        }

        useEffect(() => {
          scheduleOnUI(() => {
            const element = renderView() as React.ReactElement;
            output.value = typeof element.type === 'function';
          });
        });

        return null;
      };

      await render(<ExampleComponent />);
      await wait(100);
      const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
      expect(sharedValue.onUI).toBe(true);
    });
  }
});
