import React, { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { makeSynchronizable, runOnJS, runOnUI } from 'react-native-worklets';

const initialValue = 0;

const targetValue = 200000;

export default function SynchronizableExample() {
  const [rnValue, setRnValue] = React.useState(initialValue);
  const [rnDurationMS, setRnDurationMS] = React.useState(0);
  const [uiValue, setUiValue] = React.useState(initialValue);
  const [uiDurationMS, setUiDurationMS] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);

  const synchronizable = makeSynchronizable(initialValue);

  function setUiValueRemote(value: number, durationMS: number) {
    setUiValue(value);
    setUiDurationMS(durationMS);
  }

  function setValueAndDuration(value: number, durationMS: number) {
    'worklet';
    if (globalThis._WORKLET) {
      runOnJS(setUiValueRemote)(value, durationMS);
    } else {
      setRnValue(value);
      setRnDurationMS(durationMS);
    }
  }

  function resetState() {
    setRnValue(initialValue);
    setRnDurationMS(0);
    setUiValue(initialValue);
    setUiDurationMS(0);
  }

  function dirtyReadDirtyWrite() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = synchronizable.getDirty();
      synchronizable.setDirty(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(synchronizable.getBlocking(), durationMS);
  }

  function blockingReadDirtyWrite() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = synchronizable.getBlocking();
      synchronizable.setDirty(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(synchronizable.getBlocking(), durationMS);
  }

  function blockingReadBlockingWrite() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = synchronizable.getBlocking();
      synchronizable.setBlocking(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(synchronizable.getBlocking(), durationMS);
  }

  function locking() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      synchronizable.lock();
      const value = synchronizable.getBlocking();
      synchronizable.setBlocking(value + 1);
      synchronizable.unlock();
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(synchronizable.getBlocking(), durationMS);
  }

  useEffect(() => {
    if (isRunning && rnDurationMS && uiDurationMS) {
      setIsRunning(false);
    }
  }, [isRunning, rnDurationMS, uiDurationMS]);

  return (
    <View style={styles.container}>
      <View style={styles.table}>
        <View style={styles.leftColumn}>
          <Text>Initial value:</Text>
          <Text>Target value:</Text>
          <Text>Value read when RN finished:</Text>
          <Text>Value read when UI finished:</Text>
          <Text>Duration on RN:</Text>
          <Text>Duration on UI:</Text>
        </View>
        <View style={styles.rightColumn}>
          <Text>{initialValue}</Text>
          <Text>{targetValue * 2}</Text>
          <Text>{rnValue}</Text>
          <Text>{uiValue}</Text>
          <Text>{(rnDurationMS / 1000).toFixed(2)}s</Text>
          <Text>{(uiDurationMS / 1000).toFixed(2)}s</Text>
        </View>
      </View>
      <View style={{ opacity: isRunning ? 1 : 0 }}>
        {/* TODO: Call these on another Worklet Runtime instead of UI Runtime and use an animating indicator here. */}
        <Text>Please wait...</Text>
      </View>
      <Button
        onPress={() => {
          resetState();
          setIsRunning(true);

          setTimeout(() => {
            runOnUI(dirtyReadDirtyWrite)();
            queueMicrotask(dirtyReadDirtyWrite);
          }, 50);
        }}
        title=".getDirty() & .setDirty() on two threads"
      />
      <Button
        onPress={() => {
          resetState();
          setIsRunning(true);

          setTimeout(() => {
            runOnUI(blockingReadDirtyWrite)();
            queueMicrotask(blockingReadDirtyWrite);
          }, 50);
        }}
        title=".getBlocking() & .setDirty() on two threads"
      />
      <Button
        onPress={() => {
          resetState();
          setIsRunning(true);

          setTimeout(() => {
            runOnUI(blockingReadBlockingWrite)();
            queueMicrotask(blockingReadBlockingWrite);
          }, 50);
        }}
        title=".getBlocking() & .setBlocking() on two threads"
      />
      <Button
        onPress={() => {
          resetState();
          setIsRunning(true);

          setTimeout(() => {
            runOnUI(locking)();
            queueMicrotask(locking);
          }, 50);
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
    gap: 5,
  },
  table: {
    flex: 0.25,
    flexDirection: 'row',
    gap: 10,
  },
  leftColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    flex: 0.6,
  },
  rightColumn: {
    flex: 0.2,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
  },
});
