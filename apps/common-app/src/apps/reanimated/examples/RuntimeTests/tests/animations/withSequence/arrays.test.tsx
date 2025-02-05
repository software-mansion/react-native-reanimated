import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { describe, expect, getTestComponent, render, test, useTestRef, wait } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

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
      await render(
        <WidthComponent
          startValues={startValues}
          middleValues={middleValues}
          finalValues={finalValues}
          animationNumber={animationNumber}
        />,
      );
      const componentOne = getTestComponent(COMPONENT_REF.first);
      const componentTwo = getTestComponent(COMPONENT_REF.second);
      const componentThree = getTestComponent(COMPONENT_REF.third);
      const margin = 30;

      await wait(200 + DELAY / 2);
      expect(await componentOne.getAnimatedStyle('left')).toBe(finalValues[0] + margin, ComparisonMode.PIXEL);
      expect(await componentTwo.getAnimatedStyle('left')).toBe(finalValues[1] + margin, ComparisonMode.PIXEL);
      expect(await componentThree.getAnimatedStyle('left')).toBe(finalValues[2] + margin, ComparisonMode.PIXEL);
      await wait(300 + DELAY / 2);
      expect(await componentOne.getAnimatedStyle('left')).toBe(middleValues[0] + margin, ComparisonMode.PIXEL);
      expect(await componentTwo.getAnimatedStyle('left')).toBe(middleValues[1] + margin, ComparisonMode.PIXEL);
      expect(await componentThree.getAnimatedStyle('left')).toBe(middleValues[2] + margin, ComparisonMode.PIXEL);
      await wait(200 + DELAY);
      expect(await componentOne.getAnimatedStyle('left')).toBe(finalValues[0] + 20 + margin, ComparisonMode.PIXEL);
      expect(await componentTwo.getAnimatedStyle('left')).toBe(finalValues[1] + 20 + margin, ComparisonMode.PIXEL);
      expect(await componentThree.getAnimatedStyle('left')).toBe(finalValues[2] + 20 + margin, ComparisonMode.PIXEL);
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
