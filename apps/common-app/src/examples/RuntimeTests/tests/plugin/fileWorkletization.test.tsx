import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSharedValue, runOnUI } from 'react-native-reanimated';
import { render, wait, describe, getRegisteredValue, registerValue, test, expect } from '../../ReJest/RuntimeTestsApi';
import { ImplicitWorkletClass, getThree, implicitContextObject } from './fileWorkletization';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Test file workletization', () => {
  test('Functions and methods are workletized', async () => {
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
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(3);
  });

  test('WorkletContextObjects are workletized', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);

      useEffect(() => {
        runOnUI(() => {
          output.value = implicitContextObject.getFive();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(5);
  });

  test('WorkletClasses are workletized', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);

      useEffect(() => {
        runOnUI(() => {
          output.value = new ImplicitWorkletClass().getSeven();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(7);
  });
});
