import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { describe, expect, getTestComponent, render, test, useTestRef, wait } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

describe(`Test cancelling animation `, () => {
  const COMPONENT_REF = 'COMPONENT_REF';
  const CancelComponent = ({
    shouldCancelAnimation,
    shouldStartNewAnimation,
  }: {
    shouldCancelAnimation?: boolean;
    shouldStartNewAnimation?: boolean;
  }) => {
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
        if (shouldCancelAnimation) {
          cancelAnimation(width);
        } else if (shouldStartNewAnimation) {
          width.value = 0;
        }
      }, 200);
    });
    return (
      <View style={styles.container}>
        <Animated.View ref={ref} style={[{ width }, styles.animatedBox]} />
      </View>
    );
  };

  test('Test animation running without interruption', async () => {
    await render(<CancelComponent />);
    await wait(500);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('width')).toBe(50, ComparisonMode.PIXEL);
  });
  test('Cancelling animation with *****cancelAnimation***** finishes the whole sequence', async () => {
    await render(<CancelComponent shouldCancelAnimation />);
    await wait(500);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('width')).not.toBe(50, ComparisonMode.PIXEL);
  });
  test('Cancelling animation by *****starting new animation***** finishes the whole sequence', async () => {
    await render(<CancelComponent shouldStartNewAnimation />);
    await wait(500);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('width')).not.toBe(50, ComparisonMode.PIXEL);
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
