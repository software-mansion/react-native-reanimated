import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { scheduleOnUI, scheduleOnRN } from 'react-native-worklets';

export default function EmptyExample() {
  const callback = (msg: string) => {
    console.log('hello there', msg);
  };

  function onPress() {
    scheduleOnUI(() => {
      'worklet';
      // scheduleOnRN(callback, 'ya nerd');
      scheduleOnRN(() => {});
      // console.log('hello there', 'you');
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
