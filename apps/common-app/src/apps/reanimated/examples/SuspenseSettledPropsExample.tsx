import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Freeze } from 'react-freeze';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const PANEL_WIDTH = 280;
const OPEN_DURATION_MS = 250;
const CLOSE_DURATION_MS = 200;
// Settle threshold (1000 ms) + two GC ticks (500 ms each) + margin.
const SYNC_BACK_DELAY_MS = 2500;
const REVEAL_DELAY_MS = 600;

const instructions = [
  'Press "Run repro" and watch the box right when the "Revealed" phase starts.',
  'Expected: the box stays hidden until it slides in from the right.',
  'Bug: the box flashes fully open for about a frame right after the reveal. Record the screen to see it reliably.',
].join('\n');

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function SuspenseSettledPropsExample() {
  const translateX = useSharedValue(PANEL_WIDTH);
  const [frozen, setFrozen] = useState(true);
  const [phase, setPhase] = useState('Idle');
  const [running, setRunning] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const open = useCallback(async () => {
    setFrozen(false);
    setPhase('Revealed - the box must stay hidden');
    await wait(REVEAL_DELAY_MS);
    setPhase('Opening');
    translateX.value = withTiming(0, { duration: OPEN_DURATION_MS });
  }, [translateX]);

  const close = useCallback(() => {
    setPhase('Closing');
    translateX.value = withTiming(
      PANEL_WIDTH,
      { duration: CLOSE_DURATION_MS },
      (finished) => {
        if (finished) {
          scheduleOnRN(setFrozen, true);
        }
      }
    );
  }, [translateX]);

  const runRepro = useCallback(async () => {
    setRunning(true);
    await open();
    await wait(OPEN_DURATION_MS);
    setPhase('Open - waiting for the sync back to React');
    await wait(SYNC_BACK_DELAY_MS);
    if (!isMounted.current) {
      return;
    }
    close();
    await wait(CLOSE_DURATION_MS);
    setPhase('Frozen - waiting for the sync back to React');
    await wait(SYNC_BACK_DELAY_MS);
    if (!isMounted.current) {
      return;
    }
    await open();
    await wait(OPEN_DURATION_MS);
    if (!isMounted.current) {
      return;
    }
    setPhase('Done');
    setRunning(false);
  }, [close, open]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Freeze freeze={frozen}>
          <Animated.View style={[styles.panel, animatedStyle]}>
            <Text style={styles.panelText}>Panel</Text>
          </Animated.View>
        </Freeze>
      </View>
      <Text style={styles.phase}>{phase}</Text>
      <Text style={styles.status}>
        {frozen ? 'Suspense: frozen' : 'Suspense: revealed'}
      </Text>
      <Button title="Run repro" onPress={runRepro} disabled={running} />
      <View style={styles.row}>
        <Button title="Open" onPress={open} disabled={running || !frozen} />
        <Button title="Close" onPress={close} disabled={running || frozen} />
      </View>
      <Text style={styles.instructions}>{instructions}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  track: {
    width: PANEL_WIDTH,
    height: 160,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'gray',
  },
  panel: {
    width: PANEL_WIDTH,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'navy',
  },
  panelText: {
    color: 'white',
    fontSize: 20,
  },
  phase: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    color: 'gray',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  instructions: {
    marginHorizontal: 20,
  },
});
