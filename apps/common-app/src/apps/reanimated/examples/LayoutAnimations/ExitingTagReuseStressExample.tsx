import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SPIKE_COUNT = 60;
const SPIKE_INTERVAL_MS = 700;
const ITEM_LOOP_INTERVAL_MS = 40;
const ITEM_VISIBLE_MS = 100;
const ITEM_COUNT = 12;

const COLORS = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#C77DFF',
  '#FF9F45',
  '#00C9A7',
  '#F72585',
  '#4CC9F0',
  '#7209B7',
];

function SpikeNode({ index, onDone }: { index: number; onDone: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 200 + (index % 8) * 50 }),
      -1,
      true
    );

    const timeout = setTimeout(onDone, 32);
    return () => clearTimeout(timeout);
  }, [index, onDone, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + progress.value * 0.1,
    transform: [{ scale: 0.95 + progress.value * 0.1 }],
  }));

  return <Animated.View style={[styles.stressNode, animatedStyle]} />;
}

export default function ExitingTagReuseStressExample() {
  const sharedElementTransitionsEnabled = getStaticFeatureFlag(
    'ENABLE_SHARED_ELEMENT_TRANSITIONS'
  );
  const [visibleIds, setVisibleIds] = useState<Set<number>>(() => new Set());
  const [spikeIds, setSpikeIds] = useState<number[]>([]);
  const [running, setRunning] = useState(true);
  const cursorRef = useRef(0);
  const spikeCounterRef = useRef(0);
  const itemIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spikeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const mountNext = useCallback(() => {
    const id = cursorRef.current;
    cursorRef.current = (cursorRef.current + 1) % ITEM_COUNT;

    setVisibleIds((prev) => new Set(prev).add(id));

    const timeout = setTimeout(() => {
      setVisibleIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== timeout);
    }, ITEM_VISIBLE_MS);

    timeoutsRef.current.push(timeout);
  }, []);

  const fireSpike = useCallback(() => {
    const ids = Array.from(
      { length: SPIKE_COUNT },
      () => spikeCounterRef.current++
    );
    setSpikeIds((prev) => [...prev, ...ids]);
  }, []);

  const removeSpikeId = useCallback((id: number) => {
    setSpikeIds((prev) => prev.filter((value) => value !== id));
  }, []);

  useEffect(() => {
    if (!running) {
      if (itemIntervalRef.current) {
        clearInterval(itemIntervalRef.current);
        itemIntervalRef.current = null;
      }

      setVisibleIds(new Set());
      return;
    }

    itemIntervalRef.current = setInterval(mountNext, ITEM_LOOP_INTERVAL_MS);

    return () => {
      if (itemIntervalRef.current) {
        clearInterval(itemIntervalRef.current);
        itemIntervalRef.current = null;
      }
    };
  }, [mountNext, running]);

  useEffect(() => {
    if (!running) {
      if (spikeIntervalRef.current) {
        clearInterval(spikeIntervalRef.current);
        spikeIntervalRef.current = null;
      }

      setSpikeIds([]);
      return;
    }

    spikeIntervalRef.current = setInterval(fireSpike, SPIKE_INTERVAL_MS);

    return () => {
      if (spikeIntervalRef.current) {
        clearInterval(spikeIntervalRef.current);
        spikeIntervalRef.current = null;
      }
    };
  }, [fireSpike, running]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.stressContainer}>
        {spikeIds.map((id) => (
          <SpikeNode index={id} key={id} onDone={() => removeSpikeId(id)} />
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Exiting Tag Reuse Stress Test</Text>
        <Text style={styles.hint}>
          Reuses the same tags under heavy entering/exiting churn to catch stale
          cleanup bugs.
        </Text>
        <Text style={styles.debugLine}>
          JS flag ENABLE_SHARED_ELEMENT_TRANSITIONS ={' '}
          {String(sharedElementTransitionsEnabled)}
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          disabled={running}
          onPress={() => setRunning(true)}
          style={[
            styles.button,
            styles.startButton,
            running && styles.disabled,
          ]}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
        <Pressable
          disabled={!running}
          onPress={() => setRunning(false)}
          style={[
            styles.button,
            styles.stopButton,
            !running && styles.disabled,
          ]}>
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>

      <Text style={styles.spikeLabel}>
        {running ? `Running - spike every ${SPIKE_INTERVAL_MS}ms` : 'Stopped'}
      </Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {Array.from({ length: ITEM_COUNT }, (_, index) => {
          const isVisible = visibleIds.has(index);

          return (
            <View key={index} style={styles.slot}>
              <View style={styles.slotPlaceholder}>
                <Text style={styles.slotIndex}>{index}</Text>
              </View>
              {isVisible && (
                <Animated.View
                  entering={ZoomIn}
                  exiting={ZoomOut}
                  style={[
                    styles.itemFill,
                    { backgroundColor: COLORS[index % COLORS.length] },
                  ]}>
                  <Text style={styles.itemText}>{index}</Text>
                </Animated.View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  stressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  stressNode: {
    width: 4,
    height: 4,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: '#ff9f45',
    fontSize: 12,
  },
  debugLine: {
    color: '#8fd3ff',
    fontSize: 12,
    marginTop: 6,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  button: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#6BCB77',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  disabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  spikeLabel: {
    color: '#ffd93d',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  slot: {
    width: 64,
    height: 64,
    position: 'relative',
    overflow: 'hidden',
  },
  slotPlaceholder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  slotIndex: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
  },
  itemFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
