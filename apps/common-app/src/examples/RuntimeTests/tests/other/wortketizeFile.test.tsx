import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSharedValue, runOnUI } from 'react-native-reanimated';
import {
  render,
  wait,
  describe,
  getRegisteredValue,
  registerValue,
  test,
} from '../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { getThree } from './wortketizeFileUtils';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe.only('Test workletization', () => {
  const ExampleComponent = () => {
    const output = useSharedValue<number | null>(null);
    registerValue(SHARED_VALUE_REF, output);

    useEffect(() => {
      runOnUI(() => {
        output.value = getThree();
      })();
    });

    return <View />;
  };

  test('Test top level workletization', async () => {
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue).toBe(3);
  });
});
