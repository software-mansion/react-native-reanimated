import { Button, StyleSheet, View } from 'react-native';

import React from 'react';
import { runOnUI } from 'react-native-reanimated';

export default function ShareablesExample() {
  return (
    <View style={styles.container}>
      <CyclicObjectDemo />
      <InaccessibleObjectDemo />
      <ArrayBufferDemo />
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
    runOnUI(() => {
      console.log(ab instanceof ArrayBuffer);
      const ta = new Uint8Array(ab);
      console.log(ta[7]);
    })();
  };

  return <Button title="ArrayBuffer" onPress={handlePress} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
