/* eslint-disable @typescript-eslint/no-misused-promises */
import React, { useCallback, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  withDecay,
} from 'react-native-reanimated';
import {
  describe,
  test,
  render,
  wait,
  recordAnimationUpdates,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { View, StyleSheet } from 'react-native';

type TestCase = {
  startValue: number;
  finalValue: number;
  testID: number;
};
describe('withSequence animation of number', () => {
  const WidthComponent = ({ startValue, finalValue, testID }: TestCase) => {
    const widthActiveSV = useSharedValue(startValue);
    const widthPassiveSV = useSharedValue(startValue);

    const animateValueFn = useCallback(
      function animateValue(value: number) {
        'worklet';
        switch (testID) {
          case 0:
            return withSequence(
              withTiming(value, { duration: 100 }),
              withTiming(0, { duration: 300, easing: Easing.exp }),
              withTiming(value, { duration: 100 }),
            );
          case 1:
            return withSequence(
              withSpring(value, { duration: 200, dampingRatio: 1 }),
              withSpring(0, { duration: 100, dampingRatio: 1.5 }),
              withSpring(value + 10, { duration: 300, dampingRatio: 0.9 }),
            );
          case 2:
            return withSequence(
              withSpring(value / 2, { duration: 200, dampingRatio: 1 }),
              withTiming(-10, { duration: 500 }),
              withSpring(value, { duration: 200, dampingRatio: 1 }),
            );
          case 3:
            return withSequence(
              withTiming(value, { duration: 200 }),
              withDecay({ velocity: -900, deceleration: 0.995 }),
              withTiming(value, { duration: 200 }),
            );
          case 4:
            return withSequence(
              withTiming(value, { duration: 200 }),
              withDecay({ velocity: -900, deceleration: 0.995, rubberBandEffect: true, clamp: [30, 100] }),
              withDecay({ velocity: 900, deceleration: 0.995, rubberBandEffect: true, clamp: [30, 100] }),
              withDecay({ velocity: -900, deceleration: 0.995, rubberBandEffect: true, clamp: [30, 100] }),
            );
        }
        return 0;
      },
      [testID],
    );

    const styleActive = useAnimatedStyle(() => {
      return {
        left: animateValueFn(widthActiveSV.value),
      };
    });
    const stylePassive = useAnimatedStyle(() => {
      return {
        left: widthPassiveSV.value,
      };
    });

    useEffect(() => {
      widthActiveSV.value = finalValue;
    }, [widthActiveSV, finalValue]);

    useEffect(() => {
      widthPassiveSV.value = animateValueFn(finalValue);
    }, [widthPassiveSV, finalValue, animateValueFn]);

    return (
      <View style={styles.container}>
        <Animated.View style={[styles.animatedBox, { backgroundColor: 'palevioletred' }, styleActive]} />
        <Animated.View style={[styles.animatedBox, { backgroundColor: 'royalblue' }, stylePassive]} />
      </View>
    );
  };
  // 63 75 109 129 843
  test.each([600, 700, 1000, 1200, 2000])('Test %#', async (waitTime, index) => {
    const updatesContainerActive = await recordAnimationUpdates();
    await render(<WidthComponent startValue={0} finalValue={200} testID={index} />);
    await wait(waitTime);
    const SnapshotName = `SequenceSingleValue_${index}`;
    const activeUpdates = updatesContainerActive.getUpdates();
    console.log(`${SnapshotName}: ${activeUpdates.length}`);
    // TODO Add tests once multiple views snapshots are
  });

  test.each([600, 700, 1000, 1200, 2000])('Test %#', async (waitTime, index) => {
    const updatesContainerActive = await recordAnimationUpdates();
    await render(<WidthComponent startValue={200} finalValue={0} testID={index} />);
    await wait(waitTime);
    const SnapshotName = `SequenceSingleValue_${index}`;
    const activeUpdates = updatesContainerActive.getUpdates();
    console.log(`${SnapshotName}: ${activeUpdates.length}`);
    // TODO Add tests once multiple views snapshots are
  });
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    margin: 30,
  },
});
