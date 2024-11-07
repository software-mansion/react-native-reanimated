import React, { useCallback, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { describe, test, render, wait, useTestRef, getTestComponent, expect } from '../../../ReJest/RuntimeTestsApi';
import { View, StyleSheet } from 'react-native';
import { ComparisonMode } from '../../../ReJest/types';

type TestCase = {
  startValue: number;
  middleValue: number;
  finalValue: number;
  animationNumber: number;
};

describe('WithSequence animation of number', () => {
  enum Component {
    ACTIVE = 'ONE',
    PASSIVE = 'TWO',
  }
  const DELAY = 50;
  const WidthComponent = ({ startValue, middleValue, finalValue, animationNumber }: TestCase) => {
    const leftActiveSV = useSharedValue(startValue);
    const leftPassiveSV = useSharedValue(startValue);

    const refOne = useTestRef(Component.ACTIVE);
    const refTwo = useTestRef(Component.PASSIVE);

    const animateValueFn = useCallback(
      function animateValue(finalValue: number) {
        'worklet';
        switch (animationNumber) {
          case 0:
            return withDelay(
              DELAY,
              withSequence(
                withTiming(finalValue, { duration: 200 }),
                withDelay(DELAY, withTiming(middleValue, { duration: 300, easing: Easing.exp })),
                withDelay(DELAY, withTiming(finalValue + 20, { duration: 200 })),
              ),
            );
          case 1:
            return withSequence(
              withDelay(DELAY, withSpring(finalValue, { duration: 200, dampingRatio: 1 })),
              withDelay(DELAY, withSpring(middleValue, { duration: 300, dampingRatio: 1.5 })),
              withDelay(DELAY, withSpring(finalValue + 20, { duration: 200, dampingRatio: 0.9 })),
            );
          case 2:
            return withDelay(
              DELAY,
              withSequence(
                withSpring(finalValue, { duration: 200, dampingRatio: 1 }),
                withDelay(DELAY, withTiming(middleValue, { duration: 300 })),
                withDelay(DELAY, withSpring(finalValue + 20, { duration: 200, dampingRatio: 1 })),
              ),
            );
        }
        return 0;
      },
      [animationNumber, middleValue],
    );

    const styleActive = useAnimatedStyle(() => {
      return {
        left: animateValueFn(leftActiveSV.value),
      };
    });
    const stylePassive = useAnimatedStyle(() => {
      return {
        left: leftPassiveSV.value,
      };
    });

    useEffect(() => {
      leftActiveSV.value = finalValue;
    }, [leftActiveSV, finalValue]);

    useEffect(() => {
      leftPassiveSV.value = animateValueFn(finalValue);
    }, [leftPassiveSV, finalValue, animateValueFn]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refOne} style={[styles.animatedBox, { backgroundColor: 'palevioletred' }, styleActive]} />
        <Animated.View ref={refTwo} style={[styles.animatedBox, { backgroundColor: 'royalblue' }, stylePassive]} />
      </View>
    );
  };

  test.each([
    [0, -10, 100, 0],
    [0, -10, 100, 1],
    [0, -10, 100, 2],
    [100, 50, 0, 0],
    [100, 50, 0, 0],
    [0, 100, 100, 2],
    [100, 100, 0, 1],
    [75, 0, 75, 1],
    [0, 75, 0, 2],
  ])(
    'Animate ${0} → ${2} → ${1} → (${2} + 20), animation nr ${3}',
    async ([startValue, middleValue, finalValue, animationNumber]) => {
      await render(
        <WidthComponent
          startValue={startValue}
          middleValue={middleValue}
          finalValue={finalValue}
          animationNumber={animationNumber}
        />,
      );
      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      const margin = 30;
      const stopValues = [startValue, finalValue, middleValue, finalValue + 20].map(value => value + margin);

      await wait(DELAY / 2);
      // TODO The condition below is not fulfilled, decide whether its bug or expected behavior
      // expect(await activeComponent.getAnimatedStyle('left')).toBe(stopValues[0], ComparisonMode.DISTANCE);
      expect(await passiveComponent.getAnimatedStyle('left')).toBe(stopValues[0], ComparisonMode.PIXEL);
      await wait(200 + DELAY);
      expect(await activeComponent.getAnimatedStyle('left')).toBe(stopValues[1], ComparisonMode.PIXEL);
      expect(await passiveComponent.getAnimatedStyle('left')).toBe(stopValues[1], ComparisonMode.PIXEL);
      await wait(300 + DELAY);
      expect(await activeComponent.getAnimatedStyle('left')).toBe(stopValues[2], ComparisonMode.PIXEL);
      expect(await passiveComponent.getAnimatedStyle('left')).toBe(stopValues[2], ComparisonMode.PIXEL);
      await wait(200 + DELAY);
      expect(await activeComponent.getAnimatedStyle('left')).toBe(stopValues[3], ComparisonMode.PIXEL);
      expect(await passiveComponent.getAnimatedStyle('left')).toBe(stopValues[3], ComparisonMode.PIXEL);
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
  },
});
