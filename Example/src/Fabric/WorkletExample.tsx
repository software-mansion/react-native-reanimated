import { Button, View } from 'react-native';
import {
  runOnJS,
  runOnUI,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import React from 'react';

export default function WorkletExample() {
  // runOnUI demo
  const someWorklet = (number) => {
    'worklet';
    console.log('runOnUI:', _WORKLET, number); // _WORKLET should be true
  };

  const handlePress1 = () => {
    runOnUI(someWorklet)(Math.random());
  };

  // runOnJS demo
  const x = useSharedValue(0);

  const recordResult = (number) => {
    console.log('runOnJS:', _WORKLET, number); // _WORKLET should be false
  };

  useDerivedValue(() => {
    runOnJS(recordResult)(x.value);
  });

  const handlePress2 = () => {
    x.value = Math.random();
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={handlePress1} title="runOnUI demo" />
      <Button onPress={handlePress2} title="runOnJS demo" />
    </View>
  );
}
