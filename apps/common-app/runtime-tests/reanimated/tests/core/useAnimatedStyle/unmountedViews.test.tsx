import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../../ReJest/RuntimeTestsApi';

const ROUNDS = 20;
const ITEMS = 60;
const ROUND_DURATION = 50;

function AnimatedItem() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 300 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value / 2,
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(100)}
      style={[styles.item, animatedStyle]}
    />
  );
}

function RemountingItems() {
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (round >= ROUNDS) {
      return;
    }
    const timeout = setTimeout(() => setRound(round + 1), ROUND_DURATION);
    return () => clearTimeout(timeout);
  }, [round]);

  return (
    <View style={styles.container}>
      {round < ROUNDS &&
        Array.from({ length: ITEMS }, (_, index) => (
          <AnimatedItem key={`${round}-${index}`} />
        ))}
    </View>
  );
}

describe('Animated styles of unmounted views', () => {
  test('are removed from the props registry', async () => {
    await render(<RemountingItems />);
    await wait(ROUNDS * ROUND_DURATION + 500);
    await render(null);
    await wait(500);

    const animatedPropsRegistry = global._registriesLeakCheck().split('\n')[0];
    expect(animatedPropsRegistry).toBe('AnimatedPropsRegistry: ✅');
  });
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: 20,
    height: 20,
    margin: 2,
    backgroundColor: 'teal',
  },
});
