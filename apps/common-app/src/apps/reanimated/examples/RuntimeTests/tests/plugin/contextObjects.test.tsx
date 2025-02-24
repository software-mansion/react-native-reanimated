import React, { useEffect } from 'react';
import { View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';

import { describe, expect, getRegisteredValue, registerValue, render, test, wait } from '../../ReJest/RuntimeTestsApi';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Test context objects', () => {
  test('non-context methods are workletized', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const contextObject = {
        foo() {
          return 1;
        },
        __workletContextObject: true,
      };

      useEffect(() => {
        runOnUI(() => {
          output.value = contextObject.foo();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(1);
  });

  test('non-context properties are workletized', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const contextObject = {
        foo: () => 1,
        __workletContextObject: true,
      };

      useEffect(() => {
        runOnUI(() => {
          output.value = contextObject.foo();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(1);
  });

  test('methods preserve implicit context', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const contextObject = {
        foo() {
          return 1;
        },
        bar() {
          return this.foo() + 1;
        },
        __workletContextObject: true,
      };

      useEffect(() => {
        runOnUI(() => {
          output.value = contextObject.bar();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
  });

  test('methods preserve explicit context', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const contextObject = {
        foo() {
          return 1;
        },
        bar() {
          return this.foo.call(contextObject) + 1;
        },
        __workletContextObject: true,
      };

      useEffect(() => {
        runOnUI(() => {
          output.value = contextObject.bar();
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
  });

  test('methods change the state of the object', async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const contextObject = {
        foo: 1,
        bar() {
          this.foo += 1;
        },
        __workletContextObject: true,
      };

      useEffect(() => {
        runOnUI(() => {
          contextObject.bar();
          output.value = contextObject.foo;
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
  });

  test("the object doesn't persist in memory", async () => {
    const ExampleComponent = () => {
      const output = useSharedValue<number | null>(null);
      registerValue(SHARED_VALUE_REF, output);
      const contextObject = {
        foo: 1,
        bar() {
          this.foo += 1;
        },
        __workletContextObject: true,
      };

      useEffect(() => {
        runOnUI(() => {
          contextObject.bar();
          output.value = contextObject.foo;
        })();
      });

      return <View />;
    };
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onUI).toBe(2);
    await render(<ExampleComponent />);
    await wait(100);
    const sharedValue2 = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue2.onUI).toBe(2);
  });
});
