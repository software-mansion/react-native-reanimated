import { StyleSheet, View, Button } from 'react-native';

import { runOnUI } from 'react-native-reanimated';

import React from 'react';

export default function EmptyExample() {
  const obj = { prop: 0 };

  function worklet() {
    'worklet';
    obj.prop = obj.prop + 1;
    console.log(obj.prop);
  }

  const runWorkletOnUI = runOnUI(worklet);

  return (
    <View style={styles.container}>
      <Button title="Run worklet on UI" onPress={runWorkletOnUI} />
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
