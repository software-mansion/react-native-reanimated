import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSharedValue, runOnUI } from 'react-native-reanimated';
import { render, wait, describe, getRegisteredValue, registerValue, test, expect } from '../../ReJest/RuntimeTestsApi';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

class WorkletClass {
  __workletClass = true;
  value = 0;
  getOne() {
    return 1;
  }

  getTwo() {
    return this.getOne() + 1;
  }

  getIncremented() {
    return ++this.value;
  }
}

describe('Test worklet classes', () => {
  test('class works on React runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const clazz = new WorkletClass();

      output.value = clazz.getTwo() + clazz.getIncremented() + clazz.getIncremented();

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(5);
  });

  test('constructor works on Worklet runtime', async () => {
    const ExampleComponent = () => {
      useEffect(() => {
        runOnUI(() => {
          const clazz = new WorkletClass();
          clazz.getOne();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    // TODO: assert no crash here
  });

  test('class methods work on Worklet runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);

      useEffect(() => {
        runOnUI(() => {
          const clazz = new WorkletClass();
          output.value = clazz.getOne();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(1);
  });

  test('class instance methods preserve binding', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);

      useEffect(() => {
        runOnUI(() => {
          const clazz = new WorkletClass();
          output.value = clazz.getTwo();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
  });

  test('class instances preserve state', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);

      useEffect(() => {
        runOnUI(() => {
          const clazz = new WorkletClass();
          output.value = clazz.getIncremented() + clazz.getIncremented();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(3);
  });

  test('instanceof operator works on Worklet runtime', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<boolean | null>(null);
      registerValue(SHARED_VALUE_REF, output);

      useEffect(() => {
        runOnUI(() => {
          const clazz = new WorkletClass();
          output.value = clazz instanceof WorkletClass;
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(true);
  });

  // TODO: Add a test that throws when class is sent from React to Worklet runtime.
});
