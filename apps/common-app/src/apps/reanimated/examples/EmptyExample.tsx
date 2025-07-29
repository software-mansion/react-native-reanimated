import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { createWorkletRuntime, runOnRuntime, runOnUI } from 'react-native-worklets';

const rt = createWorkletRuntime("mleko");

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button title='mleko' onPress={() => {
        runOnRuntime(rt, () => {
          'worklet'
          setTimeout(() => {
            console.log('sT(1)')
          }, 100)
          setImmediate(() => {
            console.log('sI(1)')
          });
          console.log('op(1)')

          // setInterval(() => {
          //   console.log(Date.now(), 'xd')
          // }, 1000);

          requestAnimationFrame(() => {
            console.log('rAF')
          });
        })();
        runOnRuntime(rt, () => {
          'worklet'
          setTimeout(() => {
            console.log('sT(2)')
          }, 100)
          setImmediate(() => {
            console.log('sI(2)')
          });
          console.log('op(2)')
        })();
      }} />
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
