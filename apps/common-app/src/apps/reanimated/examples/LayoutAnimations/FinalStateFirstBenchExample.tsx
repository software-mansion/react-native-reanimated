import { useState } from 'react';
import { Alert, Button, Pressable, StyleSheet, Text, View } from 'react-native';

// Final-state-first bench (Objective 06). The nativeID markers below make the
// Legacy proxy enqueue controlled prepared native requests on example-app
// builds with IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION on; no production Layout
// Animations run here. With the flag on, the box slides 5 s (taps land at the
// final frame) and the delayed view holds invisible for 1 s, then fades in.
// With the flag off, both views jump.

const LAYOUT_BENCH_NATIVE_ID = 'fsf-bench-layout';
const ENTERING_BENCH_NATIVE_ID = 'fsf-bench-entering';

export default function FinalStateFirstBenchExample() {
  const [moved, setMoved] = useState(false);
  const [entered, setEntered] = useState(false);
  const [lastTap, setLastTap] = useState('none');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Final-state-first bench (Objective 06)</Text>

      <Text style={styles.label}>Layout: A → B over 5 s</Text>
      <Button title="Move box" onPress={() => setMoved((prev) => !prev)} />
      <View style={styles.arena}>
        <Pressable
          nativeID={LAYOUT_BENCH_NATIVE_ID}
          testID="fsf-layout-box"
          onPress={() => {
            setLastTap(moved ? 'B (final)' : 'A (final)');
            Alert.alert('Tapped', 'The tap used the mounted final frame.');
          }}
          style={[styles.box, moved ? styles.boxMoved : null]}>
          <Text style={styles.boxLabel}>tap me</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Last registered tap position: {lastTap}</Text>

      <Text style={styles.label}>Entering: 1 s delay, 2 s fade</Text>
      <Button
        title={entered ? 'Unmount delayed view' : 'Mount delayed view'}
        onPress={() => setEntered((prev) => !prev)}
      />
      <View style={styles.arena}>
        {entered ? (
          <View
            nativeID={ENTERING_BENCH_NATIVE_ID}
            testID="fsf-entering-box"
            style={[styles.box, styles.enteringBox]}>
            <Text style={styles.boxLabel}>entered</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
  },
  arena: {
    height: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'gray',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  box: {
    width: 100,
    height: 60,
    backgroundColor: 'navy',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxMoved: {
    marginLeft: 220,
    marginTop: 80,
  },
  enteringBox: {
    backgroundColor: 'darkgreen',
    marginLeft: 40,
    marginTop: 40,
  },
  boxLabel: {
    color: 'white',
  },
});
