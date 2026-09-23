import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

// Q > U > F > [A, K, B]. Every toggle moves the opacity from F to U or back, so
// the children of F move between the two views, and K sorts before them because
// of its negative zIndex. React Native's differ then emits a Create for K while
// it is mounted, or a Delete of K followed by an Insert of K. The Layout
// Animations proxy aborts on either of them in debug builds and dereferences a
// missing light node in release builds. It needs the React Native patch in
// .yarn/patches with React Native built from source.
export default function ZIndexFlattenSwapExample() {
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
      <View style={styles.stacking}>
        <View style={swapped ? styles.stacking : undefined}>
          <View style={swapped ? undefined : styles.stacking}>
            <View style={styles.first} />
            <View style={styles.raised} />
            <View style={styles.second} />
          </View>
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
  raised: {
    height: 40,
    backgroundColor: 'gold',
    zIndex: -1,
  },
  second: {
    height: 40,
    backgroundColor: 'skyblue',
  },
});
