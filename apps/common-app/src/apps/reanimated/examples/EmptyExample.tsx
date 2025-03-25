import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { makeSynchronizable, runOnUI } from 'react-native-worklets';

export default function EmptyExample() {
  const synchronizable = makeSynchronizable(0);
  function readWrite() {
    'worklet';
    const value = synchronizable.getDirty();
    console.log(value);
    synchronizable.setDirty(value + 1);
    console.log(synchronizable.getDirty());
    const vvalue = synchronizable.getBlocking();
    console.log(vvalue);
    synchronizable.setBlocking(vvalue + 1);
    console.log(synchronizable.getBlocking());
  }
  const iterations = 1000000;
  function dirtyReadDirtyWrite() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const value = synchronizable.getDirty();
      synchronizable.setDirty(value + 1);
    }
    const end = performance.now();
    console.log(_WORKLET, 'elapsed:', end - start);
    console.log(_WORKLET, synchronizable.getBlocking());
  }
  function blockingReadDirtyWrite() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const value = synchronizable.getBlocking();
      synchronizable.setDirty(value + 1);
    }
    const end = performance.now();
    console.log(_WORKLET, 'elapsed:', end - start);
    console.log(_WORKLET, synchronizable.getBlocking());
  }
  function blockingReadBlockingWrite() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const value = synchronizable.getBlocking();
      synchronizable.setBlocking(value + 1);
    }
    const end = performance.now();
    console.log(_WORKLET, 'elapsed:', end - start);
    console.log(_WORKLET, synchronizable.getBlocking());
  }
  function locking() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      synchronizable.lock();
      const value = synchronizable.getBlocking();
      synchronizable.setBlocking(value + 1);
      synchronizable.unlock();
    }
    const end = performance.now();
    console.log(_WORKLET, 'elapsed:', end - start);
    console.log(_WORKLET, synchronizable.getBlocking());
  }
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Button onPress={readWrite} title="Read/Write on the same thread" />
      <Button onPress={runOnUI(readWrite)} title="Read/Write on UI thread" />
      <Button
        onPress={() => {
          runOnUI(dirtyReadDirtyWrite)();
          queueMicrotask(dirtyReadDirtyWrite);
        }}
        title="Dirty Read/Write on two threads"
      />
      <Button
        onPress={() => {
          runOnUI(blockingReadDirtyWrite)();
          queueMicrotask(blockingReadDirtyWrite);
        }}
        title="Blocking Read/Write on two threads"
      />
      <Button
        onPress={() => {
          runOnUI(blockingReadBlockingWrite)();
          queueMicrotask(blockingReadBlockingWrite);
        }}
        title="Blocking Read/Write on two threads"
      />
      <Button
        onPress={() => {
          runOnUI(locking)();
          queueMicrotask(locking);
        }}
        title="Imperative locking"
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
