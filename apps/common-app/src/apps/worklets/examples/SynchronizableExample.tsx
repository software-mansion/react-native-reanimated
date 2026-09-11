import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type {
  FixedSynchronizable,
  Synchronizable,
} from 'react-native-worklets';
import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

const initialValue = 0;

const targetValue = 200000;

type VariantKey = 'dynamic' | 'fixed';

type RuntimeKey = 'RN' | 'UI' | 'BG';

type BenchmarkResult = { value: number; durationMS: number };

type Results = Record<VariantKey, Record<RuntimeKey, BenchmarkResult>>;

const emptyResult: BenchmarkResult = {
  value: initialValue,
  durationMS: 0,
};

const emptyResults: Results = {
  dynamic: { RN: emptyResult, UI: emptyResult, BG: emptyResult },
  fixed: { RN: emptyResult, UI: emptyResult, BG: emptyResult },
};

export default function SynchronizablePerformanceExample() {
  const [results, setResults] = React.useState<Results>(emptyResults);
  const [selectedVariant, setSelectedVariant] =
    React.useState<VariantKey>('dynamic');
  const [runningRuntimes, setRunningRuntimes] = React.useState(0);

  const fixedSynchronizable: FixedSynchronizable<number> = createSynchronizable(
    initialValue,
    { fixedType: true }
  );

  const synchronizables: Record<VariantKey, Synchronizable<number>> = {
    dynamic: createSynchronizable(initialValue),
    fixed: fixedSynchronizable,
  };

  const runtime = createWorkletRuntime({ name: 'SynchronizableExample' });

  function setResult(
    variant: VariantKey,
    runtimeKey: RuntimeKey,
    value: number,
    durationMS: number
  ) {
    setResults((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], [runtimeKey]: { value, durationMS } },
    }));
  }

  const decrementRuntimes = () => setRunningRuntimes((prev) => prev - 1);

  function setValueAndDuration(
    variant: VariantKey,
    value: number,
    durationMS: number
  ) {
    'worklet';
    if (!globalThis._WORKLET) {
      setResult(variant, 'RN', value, durationMS);
      decrementRuntimes();
      return;
    }

    const runtimeKey =
      (globalThis as Record<string, unknown>)._LABEL === 'UI' ? 'UI' : 'BG';
    scheduleOnRN(setResult, variant, runtimeKey, value, durationMS);

    scheduleOnRN(decrementRuntimes);
  }

  function resetVariant(variant: VariantKey) {
    setRunningRuntimes(0);
    setResults((prev) => ({
      ...prev,
      [variant]: { RN: emptyResult, UI: emptyResult, BG: emptyResult },
    }));
  }

  function getDirtySetBlocking(variant: VariantKey) {
    'worklet';
    const synchronizable = synchronizables[variant];
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = synchronizable.getDirty();
      synchronizable.setBlocking(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(variant, synchronizable.getBlocking(), durationMS);
  }

  function getBlockingSetBlocking(variant: VariantKey) {
    'worklet';
    const synchronizable = synchronizables[variant];
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = synchronizable.getBlocking();
      synchronizable.setBlocking(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(variant, synchronizable.getBlocking(), durationMS);
  }

  function setBlockingSetBlockingTransaction(variant: VariantKey) {
    'worklet';
    const synchronizable = synchronizables[variant];
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      synchronizable.setBlocking((prev) => prev + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(variant, synchronizable.getBlocking(), durationMS);
  }

  function getDirtySetDirty(variant: VariantKey) {
    'worklet';
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      const value = fixedSynchronizable.getDirty();
      fixedSynchronizable.setDirty(value + 1);
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(variant, fixedSynchronizable.getBlocking(), durationMS);
  }

  function imperativeLocking(variant: VariantKey) {
    'worklet';
    const synchronizable = synchronizables[variant];
    const start = performance.now();
    for (let i = 0; i < targetValue; i++) {
      synchronizable.lock();
      const value = synchronizable.getBlocking();
      synchronizable.setBlocking(value + 1);
      synchronizable.unlock();
    }
    const end = performance.now();
    const durationMS = end - start;
    setValueAndDuration(variant, synchronizable.getBlocking(), durationMS);
  }

  function runBenchmark(benchmark: (variant: VariantKey) => void) {
    const variant = selectedVariant;
    resetVariant(variant);
    setRunningRuntimes(3);

    setTimeout(() => {
      scheduleOnUI(benchmark, variant);
      scheduleOnRuntime(runtime, benchmark, variant);
      queueMicrotask(() => benchmark(variant));
    }, 50);
  }

  return (
    <View style={styles.container}>
      <View style={styles.table}>
        <View style={styles.leftColumn}>
          <Text style={styles.columnHeader}>Variant:</Text>
          <Text>Initial value:</Text>
          <Text>Target value:</Text>
          <Text>Value read when RN finished:</Text>
          <Text>Value read when UI finished:</Text>
          <Text>Value read when BG finished:</Text>
          <Text>Duration on RN:</Text>
          <Text>Duration on UI:</Text>
          <Text>Duration on BG:</Text>
        </View>
        {(['dynamic', 'fixed'] as VariantKey[]).map((variant) => (
          <View key={variant} style={styles.rightColumn}>
            <Text style={styles.columnHeader}>
              {variant === selectedVariant ? `[${variant}]` : variant}
            </Text>
            <Text>{initialValue}</Text>
            <Text>{targetValue * 3}</Text>
            <Text>{results[variant].RN.value}</Text>
            <Text>{results[variant].UI.value}</Text>
            <Text>{results[variant].BG.value}</Text>
            <Text>{(results[variant].RN.durationMS / 1000).toFixed(2)}s</Text>
            <Text>{(results[variant].UI.durationMS / 1000).toFixed(2)}s</Text>
            <Text>{(results[variant].BG.durationMS / 1000).toFixed(2)}s</Text>
          </View>
        ))}
      </View>
      <View style={{ opacity: runningRuntimes >= 1 ? 1 : 0 }}>
        <Text>Please wait...</Text>
      </View>
      <Button
        onPress={() =>
          setSelectedVariant((prev) =>
            prev === 'dynamic' ? 'fixed' : 'dynamic'
          )
        }
        title={`Selected variant: ${selectedVariant}`}
      />
      <Button
        onPress={() => runBenchmark(getDirtySetBlocking)}
        title=".getDirty() & .setBlocking() on two threads"
      />
      <Button
        onPress={() => runBenchmark(getBlockingSetBlocking)}
        title=".getBlocking() & .setBlocking() on two threads"
      />
      <Button
        onPress={() => runBenchmark(setBlockingSetBlockingTransaction)}
        title=".setBlocking() with setter on two threads - transaction"
      />
      <Button
        disabled={selectedVariant !== 'fixed'}
        onPress={() => runBenchmark(getDirtySetDirty)}
        title=".getDirty() & .setDirty() on two threads - fixed only"
      />
      <Button
        onPress={() => runBenchmark(imperativeLocking)}
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
  columnHeader: {
    fontWeight: 'bold',
  },
});
