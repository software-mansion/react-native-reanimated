import { Button, StyleSheet, View } from 'react-native';
import { createWorkletRuntime } from 'react-native-reanimated';

import React from 'react';

export default function EmptyExample() {
  const handlePress = () => {
    const runtime = createWorkletRuntime('background');
    // TODO: implement toString
    console.log(runtime);
    console.log(`${runtime}`);
    console.log(String(runtime));
  };

  return (
    <View style={styles.container}>
      <Button title="Press me" onPress={handlePress} />
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
