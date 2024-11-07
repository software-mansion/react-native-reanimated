import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { AnimatableValueObject } from 'react-native-reanimated';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ComparisonMode } from '../../../ReJest/types';
import { describe, test, expect, render, useTestRef, getTestComponent, wait } from '../../../ReJest/RuntimeTestsApi';
import { getComparisonModeForProp } from '../../../ReJest/matchers/Comparators';

describe('Test reusing animatedStyles', () => {
  const COMPONENT_REF = {
    ONE: 'ONE',
    TWO: 'TWO',
    THREE: 'THREE',
  };

  const TripleComponent = ({
    startStyle,
    finalStyle,
    animate = false,
  }: {
    startStyle: AnimatableValueObject;
    finalStyle: AnimatableValueObject;
    animate: boolean;
  }) => {
    const toggle = useSharedValue(true);

    const svStyle = useSharedValue(startStyle);

    const refOne = useTestRef(COMPONENT_REF.ONE);
    const refTwo = useTestRef(COMPONENT_REF.TWO);
    const refThree = useTestRef(COMPONENT_REF.THREE);

    const animatedStyle = useAnimatedStyle(() => {
      if (!animate) {
        return toggle.value ? startStyle : finalStyle;
      } else {
        return svStyle.value;
      }
    });

    useEffect(() => {
      if (!animate) {
        toggle.value = false;
      } else {
        svStyle.value = withTiming(finalStyle, { duration: 300 });
      }
    });

    return (
      <View style={styles.container}>
        <Animated.View ref={refOne} style={[styles.animatedBox, { backgroundColor: 'palevioletred' }, animatedStyle]} />
        <Animated.View ref={refTwo} style={[styles.animatedBox, { backgroundColor: 'teal' }, animatedStyle]} />
        <Animated.View ref={refThree} style={[styles.animatedBox, { backgroundColor: 'darkorange' }, animatedStyle]} />
      </View>
    );
  };

  const TEST_CASES: Array<{ startStyle: AnimatableValueObject; finalStyle: AnimatableValueObject; animate: boolean }> =
    [
      { startStyle: { width: 100 }, finalStyle: { width: 300 }, animate: true },
      { startStyle: { left: 10 }, finalStyle: { left: 30 }, animate: true },
      { startStyle: { top: 10 }, finalStyle: { top: 30 }, animate: true },
      { startStyle: { opacity: 0 }, finalStyle: { opacity: 1 }, animate: true },
      { startStyle: { height: 20 }, finalStyle: { height: 100 }, animate: true },
      { startStyle: { margin: 0 }, finalStyle: { margin: 100 }, animate: true },
      { startStyle: { margin: -100 }, finalStyle: { margin: 0 }, animate: true },
      { startStyle: { opacity: 0 }, finalStyle: { opacity: 1 }, animate: false },
      { startStyle: { height: 20 }, finalStyle: { height: 100 }, animate: false },
      { startStyle: { margin: 0 }, finalStyle: { margin: 100 }, animate: false },
      { startStyle: { margin: -100 }, finalStyle: { margin: 0 }, animate: false },
      { startStyle: { margin: -50, height: 20 }, finalStyle: { margin: 40, height: 200 }, animate: true },
      { startStyle: { margin: 50, height: 20 }, finalStyle: { margin: -40, height: 200 }, animate: true },
      { startStyle: { margin: -50, top: 20 }, finalStyle: { margin: 40, top: 200 }, animate: true },
      {
        startStyle: { margin: -50, top: 20, height: 20 },
        finalStyle: { margin: 40, top: 200, height: 200 },
        animate: true,
      },
      { startStyle: { height: 20, width: 100 }, finalStyle: { height: 100, width: 300 }, animate: true },
      {
        startStyle: { height: 20, width: 100, backgroundColor: 'white' },
        finalStyle: { height: 100, width: 300, backgroundColor: 'royalblue' },
        animate: true,
      },
      {
        startStyle: { height: 20, width: 100, margin: 0, backgroundColor: 'white' },
        finalStyle: { height: 100, width: 300, margin: 20, backgroundColor: 'royalblue' },
        animate: true,
      },
    ];

  test.each(TEST_CASES)(
    'Animate 3 components from ${startStyle} to ${finalStyle}, animate=${animate}',
    async ({ startStyle, finalStyle, animate }) => {
      await render(<TripleComponent startStyle={startStyle} finalStyle={finalStyle} animate={animate} />);
      const componentOne = getTestComponent(COMPONENT_REF.ONE);
      const componentTwo = getTestComponent(COMPONENT_REF.TWO);
      const componentThree = getTestComponent(COMPONENT_REF.THREE);

      await wait(300);

      // Check the distance from the top
      const finalStyleFull = { height: 80, top: 0, margin: 0, ...finalStyle };
      const { height, margin, top } = finalStyleFull;
      expect(await componentOne.getAnimatedStyle('top')).toBe(top + margin, ComparisonMode.PIXEL);
      expect(await componentTwo.getAnimatedStyle('top')).toBe(top + 3 * margin + height, ComparisonMode.PIXEL);
      expect(await componentThree.getAnimatedStyle('top')).toBe(top + 5 * margin + 2 * height, ComparisonMode.PIXEL);

      // Check the remaining props
      for (const key of ['width', 'height', 'left', 'opacity', 'backgroundColor'] as const) {
        if (key in Object.keys(finalStyle)) {
          const currentVal = await componentOne.getAnimatedStyle(key);
          expect(currentVal).toBe(finalStyle[key], getComparisonModeForProp(key));
        }
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
    height: 80,
  },
});
