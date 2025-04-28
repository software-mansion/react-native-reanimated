import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

export default function EmptyExample() {
  const eventEmitter = new EventEmitter();

  eventEmitter.addListener('message', (e: { data: string }) => {
    console.log('let\'s go:', e.data);
  });

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button title="Click me" onPress={() => eventEmitter.emit('message', { data: 'ssssssssssssssss' })} />
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
