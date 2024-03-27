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
      <BigIntDemo />
      <ArrayBufferDemo />
      <TypedArrayDemo />
      <BigIntTypedArrayDemo />
      <DataViewDemo />
      <View style={styles.bar} />
      <Button
        title="Go to freezing"
        onPress={() => navigation.navigate('Freezing')}
      />
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

function FreezingShareables() {
  const navigation =
    useNavigation<NativeStackNavigationProp<StackParams, 'Freezing'>>();

  return (
    <View style={styles.container}>
      <Button
        title="Try modify converted array"
        onPress={tryModifyConvertedArray}
      />
      <Button
        title="Try modify converted remote function"
        onPress={tryModifyConvertedRemoteFunction}
      />
      <Button
        title="Try modify converted host object"
        onPress={tryModifyConvertedHostObject}
      />
      <Button
        title="Try modify converted plain object"
        onPress={tryModifyConvertedPlainObject}
      />
      <Button
        title="Try modify converted regex literal"
        onPress={tryModifyConvertedRegexLiteral}
      />
      <Button
        title="Try modify converted RegExp instance"
        onPress={tryModifyConvertedRegexInstance}
      />
      <Button
        title="Try modify converted ArrayBuffer"
        onPress={tryModifyConvertedArrayBuffer}
      />
      <Button
        title="Try modify converted Int32Array"
        onPress={tryModifyConvertedInt32Array}
      />
      <View style={styles.bar} />
      <Button title="Go to creating" onPress={() => navigation.goBack()} />
    </View>
  );
}

function tryModifyConvertedArray() {
  const arr = [1, 2, 3];
  makeShareableCloneRecursive(arr);
  arr[0] = 2; // should warn beacuse it's frozen
}

function tryModifyConvertedRemoteFunction() {
  const foo = () => {};
  foo.bar = 1;
  makeShareableCloneRecursive(foo);
  foo.bar = 2; // should warn because it's frozen
}

function tryModifyConvertedHostObject() {
  const hostObject = TurboModuleRegistry.get('Clipboard');
  if (!hostObject) {
    console.warn('No host object found.');
    return;
  }
  makeShareableCloneRecursive(hostObject);
  // @ts-expect-error
  hostObject.prop = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedPlainObject() {
  const obj = {
    a: 1,
  };
  makeShareableCloneRecursive(obj);
  obj.a = 2; // should warn because it's frozen
}

function tryModifyConvertedRegexLiteral() {
  const regexLiteral = /a/;
  makeShareableCloneRecursive(regexLiteral);
  // @ts-expect-error
  regexLiteral.regexProp = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedRegexInstance() {
  const regexInstance = new RegExp('a');
  makeShareableCloneRecursive(regexInstance);
  // @ts-expect-error
  regexInstance.regexProp = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedArrayBuffer() {
  const arrayBuffer = new ArrayBuffer(8);
  makeShareableCloneRecursive(arrayBuffer);
  // @ts-expect-error
  arrayBuffer.arrayBufferProp = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedInt32Array() {
  const int32Array = new Int32Array(2);
  makeShareableCloneRecursive(int32Array);
  int32Array[1] = 2; // shouldn't warn because it's not frozen
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
