import { scheduleOnRN } from 'react-native-worklets';
import { describe, expect, getRegisteredValue, notify, registerValue, test, wait } from '../../ReJest/RuntimeTestsApi';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { ComparisonMode } from '../../ReJest/types';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('scheduleOnRN', () => {
  test('should schedule a function on the RN runtime', async () => {
    // Arrange
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    //  Act
    scheduleOnRN((num: number) => {
      sharedValue.value = num;
    }, 100);

    // Assert
    await wait(100);
    const sharedValueOnUI = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValueOnUI.onJS).toBe(100, ComparisonMode.NUMBER);
  });
});
