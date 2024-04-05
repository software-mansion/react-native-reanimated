import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
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

const IndependentComponents = ({
  startWidths,
  finalWidths,
  duration,
}: {
  startWidths: [number, number, number];
  finalWidths: [number, number, number];
  duration: number;
}) => {
  const widths = useSharedValue(startWidths);
  const ref0 = useTestRef('IndependentComponent0');
  const ref1 = useTestRef('IndependentComponent1');
  const ref2 = useTestRef('IndependentComponent2');

  const style0 = useAnimatedStyle(() => {
    return {
      width: widths.value[0],
    };
  });
  const style1 = useAnimatedStyle(() => {
    return {
      width: widths.value[1],
    };
  });
  const style2 = useAnimatedStyle(() => {
    return {
      width: widths.value[2],
    };
  });

  useEffect(() => {
    widths.value = withTiming(finalWidths, {
      duration,
    });
  }, [widths, finalWidths, duration]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref0} style={[styles.animatedBox, style0]} />
      <Animated.View ref={ref1} style={[styles.animatedBox, style1]} />
      <Animated.View ref={ref2} style={[styles.animatedBox, style2]} />
    </View>
  );
};

describe('withTiming animation of ARRAY', () => {
  //We should test different speeds, since it may affect the performance
  const TestSpeed = {
    'very slow': 10000,
    slow: 5000,
    medium: 1000,
    fast: 500,
    'very fast': 10,
    immediatly: 0,
  };

  (
    [
      { startWidths: [20, 20, 20], finalWidths: [300, 300, 300], speed: 'very slow' },
      { startWidths: [20, 300, 20], finalWidths: [200, 30, 200], speed: 'slow' },
      { startWidths: [20, 20, 20], finalWidths: [20, 200, 100], speed: 'medium' },
      { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 'medium' },
      { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 'fast' },
      { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 'very fast' },
      { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 'immediately' },
      { startWidths: [20, 20, 20], finalWidths: [130, 14.3, 150], speed: 'medium' },
    ] as Array<{
      startWidths: [number, number, number];
      finalWidths: [number, number, number];
      speed: keyof typeof TestSpeed;
    }>
  ).forEach(({ startWidths, finalWidths, speed: speedName }) => {
    test(`Animate ${speedName} independent components FROM ${startWidths} TO ${finalWidths}`, async () => {
      await render(
        <IndependentComponents startWidths={startWidths} finalWidths={finalWidths} duration={TestSpeed[speedName]} />,
      );
      const independentComponents = ['IndependentComponent0', 'IndependentComponent1', 'IndependentComponent2'].map(
        refName => getTestComponent(refName),
      );

      independentComponents.forEach(async (component, index) => {
        expect(await component.getAnimatedStyle('width')).toBe(startWidths[index], ComparisonMode.DISTANCE);
      });
      await wait(TestSpeed[speedName] + 200);

      independentComponents.forEach(async (component, index) => {
        expect(await component.getAnimatedStyle('width')).toBe(finalWidths[index], ComparisonMode.DISTANCE);
      });
    });
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
    backgroundColor: 'palevioletred',
    margin: 30,
  },
});
