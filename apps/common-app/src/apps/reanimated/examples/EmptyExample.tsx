import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createShareable } from 'react-native-worklets';

// const shareable = createShareable('UI', 2137);

// if (shareable.isHost) {
//   console.log('isHost shareable', true);
//   shareable.value += 1;
// } else {
//   console.log('isHost shareable', false);
//   const value = shareable.getSync();
//   console.log('obtained value', value);
// }

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
