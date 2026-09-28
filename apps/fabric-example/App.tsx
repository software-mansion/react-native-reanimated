import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const BUSY_DURATION_MS = 3000;

function busyTask() {
  const start = Date.now();
  let acc = 0;
  while (Date.now() - start < BUSY_DURATION_MS) {
    acc = (acc + Math.sqrt(acc + 1)) % 1000;
  }
  return acc;
}

export default function App() {
  const [count, setCount] = useState(0);

  const runBusyTask = () => {
    setTimeout(() => {
      busyTask();
    }, 50);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>Pressed {count} times</Text>
      <Pressable
        onPress={() => setCount((c) => c + 1)}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.tapPressed : styles.tapIdle,
        ]}>
        <Text style={styles.buttonLabel}>Tap</Text>
      </Pressable>
      <Pressable
        onPress={runBusyTask}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.busyPressed : styles.busyIdle,
        ]}>
        <Text style={styles.buttonLabel}>Busy (3s)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 32,
  },
  counter: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  button: {
    width: 260,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapIdle: {
    backgroundColor: '#2f6fed',
  },
  tapPressed: {
    backgroundColor: '#0b3aa8',
  },
  busyIdle: {
    backgroundColor: '#e8552f',
  },
  busyPressed: {
    backgroundColor: '#a63616',
  },
  buttonLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
});
