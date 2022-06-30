/* global _WORKLET */
import { Button, View, StyleSheet } from 'react-native';
import {
  runOnJS,
  runOnUI,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import React from 'react';

export default function WorkletExample() {
  // runOnUI demo
  const someWorklet = (number: number) => {
    'worklet';
    console.log(_WORKLET, number); // _WORKLET should be true
  };

  const handlePress1 = () => {
    runOnUI(someWorklet)(Math.random());
  };

  // runOnJS demo
  const x = useSharedValue(0);

  const someFunction = (number: number) => {
    console.log(_WORKLET, number); // _WORKLET should be false
  };

  useDerivedValue(() => {
    runOnJS(someFunction)(x.value);
  });

  const handlePress2 = () => {
    x.value = Math.random();
  };

  return (
    <View style={styles.container}>
      <Button onPress={handlePress1} title="runOnUI demo" />
      <Button onPress={handlePress2} title="runOnJS demo" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
