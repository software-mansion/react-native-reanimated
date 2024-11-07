import { StyleSheet, Text, View } from 'react-native';

import React from 'react';

export default function PagerExample() {
  return (
    <View style={styles.container}>
      <Text>ViewPager is not supported on web</Text>
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
