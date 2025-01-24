import { StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function LiquidSwipe() {
  return (
    <View style={styles.container}>
      <Text>MaskedView is not supported on web</Text>
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
