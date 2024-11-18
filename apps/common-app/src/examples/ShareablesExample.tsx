import { Button, StyleSheet, View, TurboModuleRegistry } from 'react-native';

import React from 'react';
import {
  makeShareableCloneRecursive,
  runOnJS,
  runOnUI,
} from 'react-native-reanimated';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

type StackParams = {
  Creating: undefined;
  Freezing: undefined;
};

const Stack = createNativeStackNavigator<StackParams>();

export default function ShareablesExample() {
  return (
    <NavigationContainer independent={true}>
      <Stack.Navigator>
        <Stack.Screen name="Creating" component={CreatingShareables} />
        <Stack.Screen name="Freezing" component={FreezingShareables} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function CreatingShareables() {
  const navigation =
    useNavigation<NativeStackNavigationProp<StackParams, 'Creating'>>();
  return (
    <View style={styles.container}>
      <CyclicObjectDemo />
      <InaccessibleObjectDemo />
      <RemoteNamedFunctionSyncCallDemo />
      <RemoteAnonymousFunctionSyncCallDemo />
      <BigIntDemo />
      <ArrayBufferDemo />
      <TypedArrayDemo />
      <BigIntTypedArrayDemo />
      <DataViewDemo />
      <ErrorDemo />
    </View>
  );
}

function CyclicObjectDemo() {
  const handlePress = () => {
    type RecursiveArray = (number | RecursiveArray)[];
    const x: RecursiveArray = [];
    x.push(1);
    x.push(x);
    runOnUI(() => {
      console.log(x);
    })();
  };

  return <Button title="Cyclic object" onPress={handlePress} />;
}

function InaccessibleObjectDemo() {
  const handlePress = () => {
    const x = new Set();
    runOnUI(() => {
      console.log(x);
      console.log(x instanceof Set); // returns false
      console.log(x.has(42)); // should throw error
    })();
  };

  return <Button title="Inaccessible object" onPress={handlePress} />;
}

function RemoteNamedFunctionSyncCallDemo() {
  const handlePress = () => {
    function foo() {}
    runOnUI(() => {
      foo();
    })();
  };

  return (
    <Button title="Remote named function sync call" onPress={handlePress} />
  );
}

function RemoteAnonymousFunctionSyncCallDemo() {
  const handlePress = () => {
    // eslint-disable-next-line no-constant-condition
    const foo = true ? () => {} : () => {};
    runOnUI(() => {
      foo();
    })();
  };

  return (
    <Button title="Remote anonymous function sync call" onPress={handlePress} />
  );
}

function BigIntDemo() {
  const handlePress = () => {
    const bigint = BigInt('1234567890');
    runOnUI(() => {
      console.log(bigint === BigInt('1234567890'));
      console.log(typeof bigint === 'bigint');
    })();
  };

  return <Button title="BigInt" onPress={handlePress} />;
}

function ArrayBufferDemo() {
  const handlePress = () => {
    const ab = new ArrayBuffer(8);
    const ta = new Uint8Array(ab);
    ta[7] = 42;
    function after() {
      console.log(ta[7] === 42);
    }
    runOnUI(() => {
      console.log(ab instanceof ArrayBuffer);
      const ta = new Uint8Array(ab);
      console.log(ta[7] === 42);
      ta[7] = 123;
      runOnJS(after)();
    })();
  };

  return <Button title="ArrayBuffer" onPress={handlePress} />;
}

function TypedArrayDemo() {
  const handlePress = () => {
    const ta1 = new Int8Array(100);
    const ta2 = new Uint8Array(100);
    const ta3 = new Uint8ClampedArray(100);
    const ta4 = new Int16Array(100);
    const ta5 = new Uint16Array(100);
    const ta6 = new Int32Array(100);
    const ta7 = new Uint32Array(100);
    const ta8 = new Float32Array(100);
    const ta9 = new Float64Array(100);

    ta1[99] = -123;
    ta2[99] = 123;
    ta3[99] = 999;
    ta4[99] = -12345;
    ta5[99] = 12345;
    ta6[99] = -123456789;
    ta7[99] = 123456789;
    ta8[99] = 123.45;
    ta9[99] = 12345.6789;

    runOnUI(() => {
      console.log(ta1 instanceof Int8Array);
      console.log(ta2 instanceof Uint8Array);
      console.log(ta3 instanceof Uint8ClampedArray);
      console.log(ta4 instanceof Int16Array);
      console.log(ta5 instanceof Uint16Array);
      console.log(ta6 instanceof Int32Array);
      console.log(ta7 instanceof Uint32Array);
      console.log(ta8 instanceof Float32Array);
      console.log(ta9 instanceof Float64Array);

      console.log(ta1[99] === -123);
      console.log(ta2[99] === 123);
      console.log(ta3[99] === 255);
      console.log(ta4[99] === -12345);
      console.log(ta5[99] === 12345);
      console.log(ta6[99] === -123456789);
      console.log(ta7[99] === 123456789);
      console.log(Math.abs(ta8[99] - 123.45) < 1e-5);
      console.log(Math.abs(ta9[99] - 12345.6789) < 1e-5);
    })();
  };

  return <Button title="TypedArray" onPress={handlePress} />;
}

function BigIntTypedArrayDemo() {
  const handlePress = () => {
    const ta1 = new BigInt64Array(100);
    const ta2 = new BigUint64Array(100);

    // BigInt literals are not available when targeting lower than ES2020
    ta1[99] = BigInt('-1234567890');
    ta2[99] = BigInt('1234567890');

    runOnUI(() => {
      console.log(ta1 instanceof BigInt64Array);
      console.log(ta2 instanceof BigUint64Array);

      console.log(ta1[99] === BigInt('-1234567890'));
      console.log(ta2[99] === BigInt('1234567890'));
    })();
  };

  return <Button title="BigIntTypedArray" onPress={handlePress} />;
}

function DataViewDemo() {
  const handlePress = () => {
    const buffer = new ArrayBuffer(16);
    const dv = new DataView(buffer);
    dv.setInt16(7, 12345);
    runOnUI(() => {
      console.log(dv instanceof DataView);
      console.log(dv.getInt16(7) === 12345);
    })();
  };

  return <Button title="DataView" onPress={handlePress} />;
}

function ErrorDemo() {
  const handlePress = () => {
    const e = new Error('error message');
    console.log(_WORKLET ? 'UI' : 'RN', e instanceof Error);
    console.log(_WORKLET ? 'UI' : 'RN', String(e));
    console.log(_WORKLET ? 'UI' : 'RN', e.stack?.length);
    runOnUI(() => {
      console.log(_WORKLET ? 'UI' : 'RN', e instanceof Error);
      console.log(_WORKLET ? 'UI' : 'RN', String(e));
      console.log(_WORKLET ? 'UI' : 'RN', e.stack?.length);
    })();
  };

  return <Button title="Error" onPress={handlePress} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: '50%',
    height: 2,
    backgroundColor: 'black',
  },
});
