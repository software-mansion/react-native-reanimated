import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { scheduleOnUI, scheduleOnRN } from 'react-native-worklets';

export default function EmptyExample() {
  function onPress() {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(function foo() {});
    });
  }

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button title="Press me" onPress={onPress} />
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
