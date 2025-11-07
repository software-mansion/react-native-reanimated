import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { scheduleOnUI, scheduleOnRN } from 'react-native-worklets';

scheduleOnUI(() => {
  scheduleOnRN(() => {
    'worklet';
    console.log('Hello from UI thread!');
  });
});

export default function EmptyExample() {
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
