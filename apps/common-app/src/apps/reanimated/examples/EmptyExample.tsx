import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { runOnUI } from 'react-native-worklets';

export default function EmptyExample() {
  const testLog = () => {
    runOnUI(() => {
      'worklet';
      console.log(global.nativeLoggingHook);
    })();
  };

  return (
    <View style={styles.container}>
      <Text>Bundle mode: console.log goes through nativeLoggingHook</Text>
      <Text>
        Legacy mode: console.log proxied to JS thread via scheduleOnRN
      </Text>
      <Button title="Test console.log from worklet" onPress={testLog} />
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
