/* global _WORKLET */
import { Button, StyleSheet, View } from 'react-native';
import {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import React from 'react';

declare global {
  const _WORKLET: boolean;
}

export default function WorkletExample() {
  // 1. runOnUI demo

  const someWorklet = (number: number) => {
    'worklet';
    console.log(_WORKLET, number); // _WORKLET should be true
  };

  const handlePress1 = () => {
    runOnUI(someWorklet)(Math.random());
  };

  // 2. runOnJS demo

  const x = useSharedValue(0);

  const someFunction = (number: number) => {
    console.log(_WORKLET, number); // _WORKLET should be false
  };

  useDerivedValue(() => {
    console.log(_WORKLET, x.value);
    runOnJS(someFunction)(x.value);
  });

  const handlePress2 = () => {
    x.value = 1 + Math.random();
  };

  // 3. Throw error on JS

  const handlePress3 = () => {
    throw new Error('Hello world from React Native JS!');
  };

  // 4. Throw error from worklet

  const handlePress4 = () => {
    runOnUI(() => {
      'worklet';
      throw new Error('Hello world from worklet!');
    })();
  };

  // 5. Throw error from nested worklet

  const handlePress5 = () => {
    runOnUI(() => {
      'worklet';
      (() => {
        'worklet';
        throw new Error('Hello world from nested worklet!');
      })();
    })();
  };

  // 6. Throw error from useAnimatedStyle

  const sv = useSharedValue(0);

  useAnimatedStyle(() => {
    if (_WORKLET && sv.value >= 1) {
      throw new Error('Hello world from useAnimatedStyle!');
    }
    return {};
  });

  const handlePress6 = () => {
    sv.value = 1 + Math.random();
  };

  // Render

  return (
    <View style={styles.container}>
      <Button onPress={handlePress1} title="runOnUI demo" />
      <Button onPress={handlePress2} title="runOnJS demo" />
      <Button onPress={handlePress3} title="Throw error on JS" />
      <Button onPress={handlePress4} title="Throw error from worklet" />
      <Button onPress={handlePress5} title="Throw error from nested worklet" />
      <Button
        onPress={handlePress6}
        title="Throw error from useAnimatedStyle"
      />
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
