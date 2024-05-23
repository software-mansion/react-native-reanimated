import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, withSequence, withDelay, withSpring } from 'react-native-reanimated';
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

const DELAY = 30;
describe(`Two components animating simultaneously stopping at various points for ${DELAY}ms`, () => {
  const COMPONENT_ZERO = 'componentZero';
  const COMPONENT_ONE = 'componentOne';

  // Each timing finishes at 150, 350+D, 600+2D, 850+3D
  const COMPONENT_0_DELAYS = [150, 200, 250, 300];
  const COMPONENT_0_VALUES = [300, 201, 328, 18.5];

  // Each timing finishes at 300, 450+D, 750+2D, 900+3D
  const COMPONENT_1_DELAYS = [300, 150, 300, 150];
  const COMPONENT_1_VALUES = [12, 200, 58, 155.5];

  const AnimatedComponent = () => {
    const width0 = useSharedValue(0);
    const width1 = useSharedValue(50);

    const [ref0, ref1] = [useTestRef(COMPONENT_ZERO), useTestRef(COMPONENT_ONE)];

    useEffect(() => {
      width0.value = withSequence(
        withTiming(COMPONENT_0_VALUES[0], { duration: COMPONENT_0_DELAYS[0] }),
        withDelay(DELAY, withTiming(COMPONENT_0_VALUES[1], { duration: COMPONENT_0_DELAYS[1] })),
        withDelay(DELAY, withSpring(COMPONENT_0_VALUES[2], { duration: COMPONENT_0_DELAYS[2] })),
        withDelay(DELAY, withTiming(COMPONENT_0_VALUES[3], { duration: COMPONENT_0_DELAYS[3] })),
      );

      width1.value = withSequence(
        withTiming(COMPONENT_1_VALUES[0], { duration: COMPONENT_1_DELAYS[0] }),
        withDelay(DELAY, withTiming(COMPONENT_1_VALUES[1], { duration: COMPONENT_1_DELAYS[1] })),
        withDelay(DELAY, withSpring(COMPONENT_1_VALUES[2], { duration: COMPONENT_1_DELAYS[2] })),
        withDelay(DELAY, withTiming(COMPONENT_1_VALUES[3], { duration: COMPONENT_1_DELAYS[3] })),
      );
    });

    return (
      <View style={styles.container}>
        <Animated.View ref={ref0} style={[styles.animatedBox, { width: width0, backgroundColor: 'mediumseagreen' }]} />
        <Animated.View ref={ref1} style={[styles.animatedBox, { width: width1, backgroundColor: 'royalblue' }]} />
      </View>
    );
  };

  test(`Check stop values after 150, ${450 + DELAY}, ${600 + 2 * DELAY} and ${900 + 3 * DELAY}ms`, async () => {
    await render(<AnimatedComponent />);
    const componentZero = getTestComponent(COMPONENT_ZERO);
    const componentOne = getTestComponent(COMPONENT_ONE);

    await wait(150); //150
    expect(await componentZero.getAnimatedStyle('width')).toBe(COMPONENT_0_VALUES[0], ComparisonMode.DISTANCE);
    await wait(300 + DELAY); //450+D
    expect(await componentOne.getAnimatedStyle('width')).toBe(COMPONENT_1_VALUES[1], ComparisonMode.DISTANCE);
    await wait(150 + DELAY); //600+2D
    expect(await componentZero.getAnimatedStyle('width')).toBe(COMPONENT_0_VALUES[2], ComparisonMode.DISTANCE);
    await wait(300 + DELAY); //900+3D
    expect(await componentOne.getAnimatedStyle('width')).toBe(COMPONENT_1_VALUES[3], ComparisonMode.DISTANCE);
  });

  test(`Check stop values after 300, ${350 + DELAY}, ${750 + 2 * DELAY} ms`, async () => {
    await render(<AnimatedComponent />);
    const componentZero = getTestComponent(COMPONENT_ZERO);
    const componentOne = getTestComponent(COMPONENT_ONE);

    await wait(300);
    expect(await componentOne.getAnimatedStyle('width')).toBe(COMPONENT_1_VALUES[0], ComparisonMode.DISTANCE);
    await wait(50 + DELAY);
    expect(await componentZero.getAnimatedStyle('width')).toBe(COMPONENT_0_VALUES[1], ComparisonMode.DISTANCE);
    await wait(400 + DELAY);
    expect(await componentOne.getAnimatedStyle('width')).toBe(COMPONENT_1_VALUES[2], ComparisonMode.DISTANCE);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 0,
    height: 80,
    margin: 30,
  },
});
