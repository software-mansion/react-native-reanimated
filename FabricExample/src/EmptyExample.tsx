import { Text, StyleSheet, View, Button } from 'react-native';

import React from 'react';
import { runOnUI } from 'react-native-reanimated';

export default function EmptyExample() {
  function testWorklet() {
    'worklet';
    console.log("it's a me Mario!");
    console.log('here we go!');
  }
  function onPress() {
    runOnUI(testWorklet)();
  }

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button title={'test'} onPress={onPress} />
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
