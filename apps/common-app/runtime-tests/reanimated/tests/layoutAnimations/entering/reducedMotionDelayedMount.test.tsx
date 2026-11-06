import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { EntryOrExitLayoutType } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  ReduceMotion,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

const FADE_IN = FadeIn.reduceMotion(ReduceMotion.Always);
const CUSTOM_ENTERING = () => {
  'worklet';
  return {
    initialValues: { opacity: 0 },
    animations: {
      opacity: withTiming(0.5, { reduceMotion: ReduceMotion.Always }),
    },
  };
};

function DelayedMount({ entering }: { entering: EntryOrExitLayoutType }) {
  const [mounted, setMounted] = useState(false);
  const ref = useTestRef('delayedEntering');
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View collapsable={false}>
      {mounted && (
        <Animated.View ref={ref} entering={entering} style={styles.box} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 100, height: 100, backgroundColor: 'blue' },
});

describe('Reduced motion entering animation after a delayed mount', () => {
  test('shows a view with FadeIn', async () => {
    await render(<DelayedMount entering={FADE_IN} />);
    await wait(500);

    const mounted =
      await getTestComponent('delayedEntering').getMountedViewProps();
    expect(mounted?.opacity).toBe(1, ComparisonMode.FLOAT_DISTANCE);
  });

  test('applies the final animation values', async () => {
    await render(<DelayedMount entering={CUSTOM_ENTERING} />);
    await wait(500);

    const mounted =
      await getTestComponent('delayedEntering').getMountedViewProps();
    expect(mounted?.opacity).toBe(0.5, ComparisonMode.FLOAT_DISTANCE);
  });
});
