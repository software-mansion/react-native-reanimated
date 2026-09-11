import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeOut,
  getStaticFeatureFlag,
} from 'react-native-reanimated';
import { runOnUI } from 'react-native-worklets';

const ITEM_COUNT = 12;
const ITEMS_PER_COMMIT = 2;
const COMMIT_INTERVAL_MS = 32;
const EXIT_DURATION_MS = 48;
const UI_STALL_INTERVAL = 8;
const UI_STALL_MS = 96;
const EXITING = FadeOut.duration(EXIT_DURATION_MS);

const COLORS = ['#7B61FF', '#FF6B6B', '#00A896', '#F4A261'];

function createItems(firstId: number, count = ITEM_COUNT) {
  return Array.from({ length: count }, (_, index) => firstId + index);
}

function stallUIThread(durationMs: number) {
  'worklet';
  const start = performance.now();
  let now = start;
  while (now - start < durationMs) {
    now = performance.now();
  }
}

export default function ExperimentalCleanupOrderingExample() {
  const experimentalProxyEnabled = getStaticFeatureFlag(
    'ENABLE_SHARED_ELEMENT_TRANSITIONS'
  );
  const nextId = useRef(ITEM_COUNT);
  const cycle = useRef(0);
  const [items, setItems] = useState(() => createItems(0));
  const [cycleCount, setCycleCount] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = setInterval(() => {
      cycle.current += 1;
      setCycleCount(cycle.current);
      if (cycle.current % UI_STALL_INTERVAL === 0) {
        runOnUI(stallUIThread)(UI_STALL_MS);
      }

      const firstId = nextId.current;
      nextId.current += ITEMS_PER_COMMIT;
      setItems((current) => [
        ...current.slice(ITEMS_PER_COMMIT),
        ...createItems(firstId, ITEMS_PER_COMMIT),
      ]);
    }, COMMIT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [running]);

  const start = () => {
    const firstId = nextId.current;
    nextId.current += ITEM_COUNT;
    setItems(createItems(firstId));
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setItems([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Experimental cleanup ordering</Text>
      <Text>
        ENABLE_SHARED_ELEMENT_TRANSITIONS = {String(experimentalProxyEnabled)}
      </Text>
      <Text style={styles.description}>
        Android queues JS hierarchy commits while short exiting animations
        finish across UI-thread stalls. The stage should clear after Stop.
      </Text>
      <Text>Cycle: {cycleCount}</Text>
      <View style={styles.controls}>
        <Button disabled={running} title="Start" onPress={start} />
        <Button disabled={!running} title="Stop" onPress={stop} />
      </View>
      <View collapsable={false} style={styles.stage}>
        {items.map((id) => (
          <Animated.View
            collapsable={false}
            exiting={EXITING}
            key={id}
            style={[
              styles.item,
              { backgroundColor: COLORS[id % COLORS.length] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 20,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  description: {
    lineHeight: 20,
  },
  item: {
    borderRadius: 8,
    height: 52,
    width: 52,
  },
  stage: {
    alignContent: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 220,
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
