import { StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function ScreenAnimationExample() {
  return (
    <View style={styles.container}>
      <Text>Screen animation is not supported on web</Text>
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
