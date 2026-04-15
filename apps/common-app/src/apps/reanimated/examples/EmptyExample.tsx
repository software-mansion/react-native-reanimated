import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { runOnUISync, scheduleOnUI } from 'react-native-worklets';

function badFn(callBack: () => void) {
  'worklet';
  callBack();
}

export default function EmptyExample() {
  // scheduleOnUI(badFn, () => {
  //   'worklet';
  //   // throw new Error('Skibi');
  // });
  runOnUISync(badFn, () => {
    'worklet';
    throw new Error('Skibi');
  });
  // scheduleOnUI(badFn, () => {
  //   'worklet';
  //   // throw new Error('Skibi');
  // });

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
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
