import React from 'react';
import { Text, StyleSheet, View, Button } from 'react-native';
import { Worker } from 'react-native-worklets';

function demo() {
  console.log(!!window.Worker);

  const myWorker = new Worker(() => {
    'worklet';

    console.log('Hello from worker');

    onmessage = (e) => {
      console.log('Worker', e.data);

      const now = performance.now();
      while (performance.now() - now < 3000) {
        // do nothing
      }

      global.postMessage([4, 5, 6]);
    };
  });

  console.log(myWorker.toString());

  myWorker.onmessage = (e) => {
    console.log('JS', e.data);
  };

  myWorker.postMessage([1, 2, 3]);
}

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button title="Press me" onPress={demo} />
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