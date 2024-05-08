import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, AnimatableValueObject } from 'react-native-reanimated';
import React from 'react';
import { ComparisonMode } from '../../../ReanimatedRuntimeTestsRunner/types';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  getTestComponent,
  wait,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { getComparisonModeForProp } from '../../../ReanimatedRuntimeTestsRunner/Comparators';

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
        svStyle.value = withTiming(finalStyle, { duration: 900 });
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

      await wait(1000);

      // Check the distance from the top
      const componentHeight = 'height' in finalStyle ? (finalStyle.height as number) : 80;
      const componentMargin = 'margin' in finalStyle ? (finalStyle.margin as number) : 0;
      const componentTop = 'top' in finalStyle ? (finalStyle.top as number) : 0;

      expect(await componentOne.getAnimatedStyle('top')).toBe(componentTop + componentMargin, ComparisonMode.DISTANCE);
      expect(await componentTwo.getAnimatedStyle('top')).toBe(
        componentTop + 3 * componentMargin + componentHeight,
        ComparisonMode.DISTANCE,
      );
      expect(await componentThree.getAnimatedStyle('top')).toBe(
        componentTop + 5 * componentMargin + 2 * componentHeight,
        ComparisonMode.DISTANCE,
      );

      // Check the remaining props
      for (let key of ['width', 'height', 'left', 'opacity', 'backgroundColor'] as const) {
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
