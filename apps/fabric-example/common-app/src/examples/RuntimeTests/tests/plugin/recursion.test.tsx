import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSharedValue, runOnUI, runOnJS } from 'react-native-reanimated';
import { render, wait, describe, getRegisteredValue, registerValue, test, expect } from '../../ReJest/RuntimeTestsApi';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Test recursion in worklets', () => {
  test('on Worklet runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      function recursiveWorklet(a: number) {
        if (a === 2) {
          output.value = a;
        } else {
          recursiveWorklet(a + 1);
        }
      }

      useEffect(() => {
        runOnUI(recursiveWorklet)(0);
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
  });

  test('on React runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      function recursiveWorklet(a: number) {
        if (a === 2) {
          output.value = a;
        } else {
          recursiveWorklet(a + 1);
        }
      }

      useEffect(() => {
        recursiveWorklet(0);
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(2);
  });

  test('from React to Worklet runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      function recursiveWorklet(a: number) {
        if (a === 2) {
          output.value = a;
        } else if (a === 1) {
          runOnUI(recursiveWorklet)(a + 1);
        } else {
          recursiveWorklet(a + 1);
        }
      }

      useEffect(() => {
        recursiveWorklet(0);
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
  });

  test('from Worklet to React runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      function recursiveWorklet(a: number) {
        if (a === 2) {
          output.value = a;
        } else if (a === 1) {
          try {
            // TODO: Such case isn't supported at the moment -
            // a function can't be a Worklet and a Remote function at the same time.
            // Consider supporting it in the future.
            runOnJS(recursiveWorklet)(a + 1);
          } catch {}
        } else {
          recursiveWorklet(a + 1);
        }
      }

      useEffect(() => {
        runOnUI(recursiveWorklet)(0);
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(null);
  });
});
