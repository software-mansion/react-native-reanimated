import { scheduleOnRN } from 'react-native-worklets';
import { describe, expect, getRegisteredValue, registerValue, render, test, wait } from '../../ReJest/RuntimeTestsApi';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { ComparisonMode } from '../../ReJest/types';
import { View } from 'react-native';
import { useEffect } from 'react';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

const TestComponent = () => {
  const sharedValue = useSharedValue(0);
  registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

  useEffect(() => {
    scheduleOnRN((num: number) => {
      sharedValue.value = num;
    }, 100);
  }, []);

  return <View />;
};

describe('scheduleOnRN', () => {
  test('should schedule a function on the RN runtime', async () => {
    // Arrange & Act
    await render(<TestComponent />);

    // Assert
    await wait(100);
    const sharedValueOnUI = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValueOnUI.onJS).toBe(100, ComparisonMode.NUMBER);
    expect(sharedValueOnUI.onUI).toBe(100, ComparisonMode.NUMBER);
  });
});
