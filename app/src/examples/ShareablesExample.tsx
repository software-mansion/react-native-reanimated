import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import { runOnJS, runOnUI } from 'react-native-reanimated';

export default function ShareablesExample() {
  return (
    <View style={styles.container}>
      <CyclicObjectDemo />
      <InaccessibleObjectDemo />
      <ArrayBufferDemo />
      <TypedArrayDemo />
      <DataViewDemo />
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
    })();
  };

  return <Button title="Inaccessible object" onPress={handlePress} />;
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
    const ta = new Uint32Array(8);
    ta[7] = 1234567;
    runOnUI(() => {
      console.log(ta instanceof Uint32Array);
      console.log(ta[7] === 1234567);
    })();
  };

  return <Button title="TypedArray" onPress={handlePress} />;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
