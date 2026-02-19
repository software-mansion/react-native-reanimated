import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  createSynchronizable,
  scheduleOnRN,
  scheduleOnUI,
  createWorkletRuntime,
  scheduleOnRuntime,
} from 'react-native-worklets';

const initialValue = 0;

const targetValue = 200000;

export default function SynchronizablePerformanceExample() {
  const [valueRN, setValueRN] = React.useState(initialValue);
  const [durationRNMS, setDurationRNMS] = React.useState(0);
  const [valueUI, setValueUI] = React.useState(initialValue);
  const [durationUIMS, setDurationUIMS] = React.useState(0);
  const [valueBG, setValueBG] = React.useState(initialValue);
  const [durationBGMS, setDurationBGMS] = React.useState(0);
  const [runningRuntimes, setRunningRuntimes] = React.useState(0);

  const synchronizable = createSynchronizable(initialValue);

  const runtime = createWorkletRuntime({ name: 'SynchronizableExample' });

  function setUIValueRemote(value: number, durationMS: number) {
    setValueUI(value);
    setDurationUIMS(durationMS);
  }

  function setBGValueRemote(value: number, durationMS: number) {
    setValueBG(value);
    setDurationBGMS(durationMS);
  }

  const decrementRuntimes = () => setRunningRuntimes((prev) => prev - 1);

  function setValueAndDuration(value: number, durationMS: number) {
    'worklet';
    if (!globalThis._WORKLET) {
      setValueRN(value);
      setDurationRNMS(durationMS);
      decrementRuntimes();
      return;
    }

    if ((globalThis as Record<string, unknown>)._LABEL === 'UI') {
      scheduleOnRN(setUIValueRemote, value, durationMS);
    } else {
      scheduleOnRN(setBGValueRemote, value, durationMS);
    }

    scheduleOnRN(decrementRuntimes);
  }

  function resetState() {
    setRunningRuntimes(0);
    setValueRN(initialValue);
    setDurationRNMS(0);
    setValueUI(initialValue);
    setDurationUIMS(0);
    setValueBG(initialValue);
    setDurationBGMS(0);
  }

  function getDirtySetBlocking() {
    'worklet';
    globalThis.__failAfterLogBox = true;
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = synchronizable.getDirty();
      synchronizable.setBlocking(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(synchronizable.getBlocking(), durationMS);
  }

  function getBlockingSetBlocking() {
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

  function setBlockingSetBlockingTransaction() {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      synchronizable.setBlocking((prev) => prev + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(synchronizable.getBlocking(), durationMS);
  }

  function imperativeLocking() {
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

  return (
    <View style={styles.container}>
      <View style={styles.table}>
        <View style={styles.leftColumn}>
          <Text>Initial value:</Text>
          <Text>Target value:</Text>
          <Text>Value read when RN finished:</Text>
          <Text>Value read when UI finished:</Text>
          <Text>Value read when BG finished:</Text>
          <Text>Duration on RN:</Text>
          <Text>Duration on UI:</Text>
          <Text>Duration on BG:</Text>
        </View>
        <View style={styles.rightColumn}>
          <Text>{initialValue}</Text>
          <Text>{targetValue * 3}</Text>
          <Text>{valueRN}</Text>
          <Text>{valueUI}</Text>
          <Text>{valueBG}</Text>
          <Text>{(durationRNMS / 1000).toFixed(2)}s</Text>
          <Text>{(durationUIMS / 1000).toFixed(2)}s</Text>
          <Text>{(durationBGMS / 1000).toFixed(2)}s</Text>
        </View>
      </View>
      <View style={{ opacity: runningRuntimes >= 1 ? 1 : 0 }}>
        <Text>Please wait...</Text>
      </View>
      <Button
        onPress={() => {
          resetState();
          setRunningRuntimes(3);

          setTimeout(() => {
            scheduleOnUI(getDirtySetBlocking);
            scheduleOnRuntime(runtime, getDirtySetBlocking);
            queueMicrotask(getDirtySetBlocking);
          }, 50);
        }}
        title=".getDirty() & .setBlocking() on two threads"
      />
      <Button
        onPress={() => {
          resetState();
          setRunningRuntimes(3);

          setTimeout(() => {
            scheduleOnRuntime(runtime, getBlockingSetBlocking);
            scheduleOnUI(getBlockingSetBlocking);
            queueMicrotask(getBlockingSetBlocking);
          }, 50);
        }}
        title=".getBlocking() & .setBlocking() on two threads"
      />
      <Button
        onPress={() => {
          resetState();
          setRunningRuntimes(3);

          setTimeout(() => {
            scheduleOnUI(setBlockingSetBlockingTransaction);
            scheduleOnRuntime(runtime, setBlockingSetBlockingTransaction);
            queueMicrotask(setBlockingSetBlockingTransaction);
          }, 50);
        }}
        title=".setBlocking() with setter on two threads - transaction"
      />
      <Button
        onPress={() => {
          resetState();
          setRunningRuntimes(3);

          setTimeout(() => {
            scheduleOnUI(imperativeLocking);
            scheduleOnRuntime(runtime, imperativeLocking);
            queueMicrotask(imperativeLocking);
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
    marginBottom: 120,
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
