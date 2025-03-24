import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { runOnJS, runOnUI } from 'react-native-worklets';

function foo() {
  'worklet';
  console.log('4', _WORKLET);
}

function bar() {
  'worklet';
  console.log('3', _WORKLET);
  runOnJS(foo)();
}

function baz() {
  'worklet';
  console.log('2', _WORKLET);
  runOnUI(bar)();
}

function foobar() {
  'worklet';
  console.log('1', _WORKLET);
  runOnJS(baz)();
}

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button onPress={() => runOnUI(foobar)()} title="pres" />
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
