import { Button, StyleSheet, Text, View } from 'react-native';

import React from 'react';
import { scheduleOnUI } from 'react-native-worklets';

declare global {
  var _beginSection: (name: string) => void;
  var _endSection: () => void;
}

function handlePress() {
  scheduleOnUI(() => {
    globalThis._beginSection('SystraceSectionExample');
    const start = performance.now();
    // eslint-disable-next-line no-empty
    while (performance.now() - start < 1000) {}
    globalThis._endSection();
  });
}

export default function SystraceSectionExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button
        title="Begin section, wait 1 second, end section"
        onPress={handlePress}
      />
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
