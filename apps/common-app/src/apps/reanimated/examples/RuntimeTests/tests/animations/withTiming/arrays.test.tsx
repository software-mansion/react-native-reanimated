import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { describe, expect, getTestComponent, render, test, useTestRef, wait } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const COMPONENT_REF = {
  first: 'firstComponent',
  second: 'secondComponent',
  third: 'thirdComponent',
};
const IndependentComponents = ({
  startWidths,
  finalWidths,
  duration,
  scalars,
}: {
  startWidths: [number, number, number];
  finalWidths: [number, number, number];
  scalars: [number, number, number];
  duration: number;
}) => {
  const widths = useSharedValue(startWidths);
  const ref0 = useTestRef(COMPONENT_REF.first);
  const ref1 = useTestRef(COMPONENT_REF.second);
  const ref2 = useTestRef(COMPONENT_REF.third);

  const style0 = useAnimatedStyle(() => {
    return { width: widths.value[0] * scalars[0] };
  });
  const style1 = useAnimatedStyle(() => {
    return { width: widths.value[1] * scalars[1] };
  });
  const style2 = useAnimatedStyle(() => {
    return { width: widths.value[2] * scalars[2] };
  });

  useEffect(() => {
    widths.value = withDelay(
      100,
      withTiming(finalWidths, {
        duration,
      }),
    );
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
  const TEST_CASES: Array<{
    startWidths: [number, number, number];
    finalWidths: [number, number, number];
    scalars?: [number, number, number];
    speed: number;
  }> = [
    { startWidths: [20, 20, 20], finalWidths: [300, 300, 300], speed: 10000 },
    { startWidths: [20, 300, 20], finalWidths: [200, 30, 200], speed: 5000 },
    { startWidths: [20, 20, 20], finalWidths: [20, 200, 100], speed: 1000 },
    { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 1000 },
    { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 500 },
    { startWidths: [20, 20, 20], finalWidths: [20, 140, 150], speed: 500 },
    { startWidths: [20, 20, 20], finalWidths: [20, 20, 150], speed: 500 },
    { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 10 },
    { startWidths: [200, 200, 200], finalWidths: [130, 140, 150], speed: 10 },
    { startWidths: [200, 200, 200], finalWidths: [200, 140, 150], speed: 10 },
    { startWidths: [20, 20, 20], finalWidths: [130, 140, 150], speed: 0 },
    { startWidths: [20, 20, 20], finalWidths: [130, 14.3, 150], speed: 500 },
    { startWidths: [2e-4, 20, 20], finalWidths: [13.78e-4, 200, 20], scalars: [1e5, 1, 1], speed: 500 },
    { startWidths: [2e-9, 20, 20], finalWidths: [13.78e-9, 200, 20], scalars: [1e10, 1, 1], speed: 500 },
    { startWidths: [2e-17, 20, 20], finalWidths: [13.78e-17, 200, 20], scalars: [1e18, 1, 1], speed: 500 },
    { startWidths: [2e-125, 1e20, 20], finalWidths: [13.78e-125, 1e20, 20], scalars: [1e126, 1e-19, 1], speed: 500 },
    { startWidths: [2e-130, 1e-20, 20], finalWidths: [13.78e-125, 15e20, 20], scalars: [1e126, 1e-19, 1], speed: 50 },
  ];

  test.each(TEST_CASES)(
    'Animate independent components ${speed}ms FROM ${startWidths} TO ${finalWidths}',
    async ({ startWidths, finalWidths, scalars: passedScalars, speed }) => {
      const scalars: [number, number, number] = passedScalars || [1, 1, 1];
      await render(
        <IndependentComponents
          startWidths={startWidths}
          finalWidths={finalWidths}
          duration={speed}
          scalars={scalars}
        />,
      );
      const components = Object.values(COMPONENT_REF).map(refName => getTestComponent(refName));
      let index = 0;
      index = 0;
      for (const component of components) {
        expect(await component.getAnimatedStyle('width')).toBe(
          startWidths[index] * scalars[index],
          ComparisonMode.PIXEL,
        );
        index += 1;
      }
      await wait(speed + 200);
      index = 0;
      for (const component of components) {
        expect(await component.getAnimatedStyle('width')).toBe(
          finalWidths[index] * scalars[index],
          ComparisonMode.PIXEL,
        );
        index += 1;
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
    backgroundColor: 'palevioletred',
    margin: 30,
  },
});
