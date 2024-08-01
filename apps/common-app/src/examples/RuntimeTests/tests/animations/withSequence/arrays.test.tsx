import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import {
  describe,
  test,
  render,
  wait,
  useTestRef,
  getTestComponent,
  expect,
  recordAnimationUpdates,
  mockAnimationTimer,
} from '../../../ReJest/RuntimeTestsApi';
import { View, StyleSheet } from 'react-native';
import { ArraySnapshots } from './snapshots.snapshot';

type TestCase = {
  startValues: [number, number, number];
  middleValues: [number, number, number];
  finalValues: [number, number, number];
  animationNumber: number;
};

describe('withSequence animation of array', () => {
  const COMPONENT_REF = {
    first: 'firstComponent',
    second: 'secondComponent',
    third: 'thirdComponent',
  };

  const DELAY = 50;
  const WidthComponent = ({ startValues, middleValues, finalValues, animationNumber }: TestCase) => {
    const lefts = useSharedValue<[number, number, number]>(startValues);
    const ref0 = useTestRef(COMPONENT_REF.first);
    const ref1 = useTestRef(COMPONENT_REF.second);
    const ref2 = useTestRef(COMPONENT_REF.third);

    function animateValue(finalValues: [number, number, number]) {
      'worklet';
      const finalValuesPlus20 = finalValues.map(val => val + 20);
      switch (animationNumber) {
        case 0:
          return withSequence(
            withTiming(finalValues, { duration: 200 }),
            withDelay(DELAY, withTiming(middleValues, { duration: 300, easing: Easing.exp })),
            withDelay(DELAY, withTiming(finalValuesPlus20, { duration: 200 })),
          );
        case 1:
          return withSequence(
            withSpring(finalValues, { duration: 200, dampingRatio: 1 }),
            withDelay(DELAY, withSpring(middleValues, { duration: 300, dampingRatio: 1.5 })),
            withDelay(DELAY, withSpring(finalValuesPlus20, { duration: 200, dampingRatio: 0.9 })),
          );
        case 2:
          return withSequence(
            withSpring(finalValues, { duration: 200, dampingRatio: 1 }),
            withDelay(DELAY, withTiming(middleValues, { duration: 300 })),
            withDelay(DELAY, withSpring(finalValuesPlus20, { duration: 200, dampingRatio: 1 })),
          );
      }
      return [0, 0, 0];
    }

    const style0 = useAnimatedStyle(() => {
      return { left: lefts.value[0] };
    });
    const style1 = useAnimatedStyle(() => {
      return { left: lefts.value[1] };
    });
    const style2 = useAnimatedStyle(() => {
      return { left: lefts.value[2] };
    });

    useEffect(() => {
      lefts.value = animateValue(finalValues) as [number, number, number];
    });
    return (
      <View style={styles.container}>
        <Animated.View ref={ref0} style={[styles.animatedBox, style0]} />
        <Animated.View ref={ref1} style={[styles.animatedBox, style1]} />
        <Animated.View ref={ref2} style={[styles.animatedBox, style2]} />
      </View>
    );
  };

  test.each([
    { startValues: [0, 10, 20], middleValues: [0, 100, 210], finalValues: [20, 10, 30], animationNumber: 0 },
    { startValues: [0, 10, 20], middleValues: [0, 150, 160], finalValues: [40, 10, 30], animationNumber: 1 },
    { startValues: [0, 10, 20], middleValues: [0, 150, 160], finalValues: [40, 10, 30], animationNumber: 2 },
    { startValues: [30, 10, 55], middleValues: [0, -10, 60], finalValues: [40, 10, 30], animationNumber: 0 },
    { startValues: [30, 10, 55], middleValues: [0, -10, 60], finalValues: [40, 10, 30], animationNumber: 1 },
    { startValues: [30, 10, 55], middleValues: [0, -10, 60], finalValues: [40, 10, 30], animationNumber: 2 },
  ] as Array<TestCase>)(
    'Animate ${startValues} → ${finalValues} → ${middleValues} → ${finalValues}, animation nr ${animationNumber}',
    async ({ startValues, middleValues, finalValues, animationNumber }) => {
      await mockAnimationTimer();
      const updatesContainer = await recordAnimationUpdates();

      await render(
        <WidthComponent
          startValues={startValues}
          middleValues={middleValues}
          finalValues={finalValues}
          animationNumber={animationNumber}
        />,
      );

      const snapshotNamePrefix = `from_${startValues.join('_')}_through_${middleValues.join('_')}_to_${finalValues.join(
        '_',
      )}_animation_${animationNumber}`.replace('-', 'min');

      await wait(1000); // waitForAnimationUpdates doesn't work with multiple view recordings

      for (const refName of ['first', 'second', 'third'] as const) {
        const snapshotName = `${snapshotNamePrefix}_${refName}` as keyof typeof ArraySnapshots;

        expect(updatesContainer.getUpdates(getTestComponent(COMPONENT_REF[refName]))).toMatchSnapshots(
          ArraySnapshots[snapshotName],
        );
      }
    },
  );
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
    backgroundColor: 'steelblue',
  },
});
