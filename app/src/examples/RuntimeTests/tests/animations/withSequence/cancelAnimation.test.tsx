import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withSequence, cancelAnimation, withTiming } from 'react-native-reanimated';
import React from 'react';
import {
  describe,
  test,
  expect,
  render,
  wait,
  getTestComponent,
  useTestRef,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReanimatedRuntimeTestsRunner/types';

describe(`Test cancelAnimation `, () => {
  const COMPONENT_REF = 'COMPONENT_REF';
  const CancelComponent = ({ cancel }: { cancel?: boolean }) => {
    const width = useSharedValue(0);
    const ref = useTestRef(COMPONENT_REF);
    useEffect(() => {
      width.value = withSequence(
        withTiming(100, { duration: 130 }),
        withTiming(300, { duration: 130 }),
        withTiming(50, { duration: 130 }),
      );
    });
    useEffect(() => {
      setTimeout(() => {
        if (cancel) {
          cancelAnimation(width);
        }
      }, 200);
    });
    return (
      <View style={styles.container}>
        <Animated.View ref={ref} style={[{ width: width }, styles.animatedBox]} />
      </View>
    );
  };

  test('Finishing sequence animation normally', async () => {
    await render(<CancelComponent cancel={false} />);
    await wait(500);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('width')).toBe(50, ComparisonMode.DISTANCE);
  });
  test('Cancelling animation finishes the whole sequence', async () => {
    await render(<CancelComponent cancel={true} />);
    await wait(500);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('width')).not.toBe(50, ComparisonMode.DISTANCE);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    backgroundColor: 'darkorange',
    height: 80,
    margin: 30,
  },
});
