import { createWorkletRuntime, runOnRuntime, runOnUI, scheduleOnRN } from 'react-native-worklets';
import {
  describe,
  expect,
  getRegisteredValue,
  registerValue,
  render,
  test,
  waitForNotify,
  notify,
} from '../../ReJest/RuntimeTestsApi';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { ComparisonMode } from '../../ReJest/types';
import { View } from 'react-native';
import { useEffect } from 'react';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';
const NOTIFICATION_NAME = 'NOTIFICATION_NAME';

const TestComponent = ({ runFrom }: { runFrom: 'ui' | 'js' | 'workletRuntime' }) => {
  const sharedValue = useSharedValue(0);
  registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

  useEffect(() => {
    if (runFrom === 'ui') {
      runOnUI(() => {
        scheduleOnRN((num: number) => {
          sharedValue.value = num;
        }, 100);
      })();
    } else if (runFrom === 'js') {
      scheduleOnRN((num: number) => {
        sharedValue.value = num;
      }, 100);
    } else if (runFrom === 'workletRuntime') {
      const workletRuntime = createWorkletRuntime();
      runOnRuntime(workletRuntime, () => {
        scheduleOnRN((num: number) => {
          sharedValue.value = num;
        }, 100);
      });
    }
    notify(NOTIFICATION_NAME);
  }, []);

  return <View />;
};

describe('scheduleOnRN', () => {
  test('should schedule a function on the RN runtime from UI', async () => {
    // Arrange & Act
    await render(<TestComponent runFrom="ui" />);

    // Assert
    await waitForNotify(NOTIFICATION_NAME);
    const sharedValueOnUI = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValueOnUI.onJS).toBe(100, ComparisonMode.NUMBER);
    expect(sharedValueOnUI.onUI).toBe(100, ComparisonMode.NUMBER);
  });

  test('should schedule a function on the RN runtime from JS', async () => {
    // Arrange & Act
    await render(<TestComponent runFrom="js" />);

    // Assert
    await waitForNotify(NOTIFICATION_NAME);
    const sharedValueOnJS = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValueOnJS.onJS).toBe(100, ComparisonMode.NUMBER);
  });

  test('should schedule a function on the RN runtime from workletRuntime', async () => {
    // Arrange & Act
    await render(<TestComponent runFrom="workletRuntime" />);

    // Assert
    await waitForNotify(NOTIFICATION_NAME);
    const sharedValueOnWorkletRuntime = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValueOnWorkletRuntime.onJS).toBe(100, ComparisonMode.NUMBER);
  });
});
