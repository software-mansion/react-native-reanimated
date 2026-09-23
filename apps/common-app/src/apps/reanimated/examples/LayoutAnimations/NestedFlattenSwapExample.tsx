import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

// Y > X > [A, B]. Every toggle moves the opacity from X to Y or back, so in one
// commit Y stops being flattened while X gets flattened, and the children of X
// move to Y. The differ emits the Remove of X before the Removes of its
// children. The Layout Animations proxy used to tear the moving children down at
// the Remove of X, which aborted on `shadowIndex is out of range` in debug
// builds and corrupted its light tree in release builds.
export default function NestedFlattenSwapExample() {
  const [swapped, setSwapped] = useState(false);
  const [running, setRunning] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(() => {
      setSwapped((value) => !value);
      setCount((value) => value + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <View style={styles.container}>
      <Text>swaps: {count}</Text>
      <Button
        title={running ? 'Pause' : 'Resume'}
        onPress={() => setRunning((value) => !value)}
      />
      <View style={swapped ? styles.stacking : undefined}>
        <View style={swapped ? undefined : styles.stacking}>
          <View style={styles.first} />
          <View style={styles.second} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  stacking: {
    opacity: 0.9,
  },
  first: {
    height: 40,
    backgroundColor: 'tomato',
  },
  second: {
    height: 40,
    backgroundColor: 'skyblue',
  },
});
