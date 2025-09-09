import { runOnUISync } from 'react-native-worklets';
import {
  describe,
  expect,
  getRegisteredValue,
  registerValue,
  render,
  test,
  waitForNotification,
  notify,
} from '../../ReJest/RuntimeTestsApi';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { ComparisonMode } from '../../ReJest/types';
import { View } from 'react-native';
import { useEffect } from 'react';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';
const NOTIFICATION_NAME = 'NOTIFICATION_NAME';

const TestComponent = () => {
  const sharedValue = useSharedValue(0);
  registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

  useEffect(() => {
    const callback = (num: number) => {
      'worklet';
      sharedValue.value = num;
      notify(NOTIFICATION_NAME);
    };
    runOnUISync(callback, 100);
  }, [sharedValue]);

  return <View />;
};

describe('runOnUISync', () => {
  test('use runOnUISync to run a function on the UI runtime', async () => {
    // Arrange & Act
    await render(<TestComponent />);

    // Assert
    await waitForNotification(NOTIFICATION_NAME);
    const sharedValueOnJS = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValueOnJS.onJS).toBe(100, ComparisonMode.NUMBER);
  });
});
