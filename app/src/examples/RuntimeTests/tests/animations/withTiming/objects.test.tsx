import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  AnimatableValueObject,
} from 'react-native-reanimated';
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

const COMPONENT_REF = 'AnimatedComponent';
const TestComponent = ({
  startStyle,
  finalStyle,
}: {
  startStyle: AnimatableValueObject;
  finalStyle: AnimatableValueObject;
}) => {
  const sharedStyle = useSharedValue(startStyle);
  const ref = useTestRef(COMPONENT_REF);

  const animatedStyle = useAnimatedStyle(() => {
    return sharedStyle.value;
  });

  useEffect(() => {
    sharedStyle.value = withDelay(
      100,
      withTiming(finalStyle, {
        duration: 1000,
      })
    );
  });

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.animatedBox, animatedStyle]} />
    </View>
  );
};

describe('withTiming animation of OBJECT', () => {
  (
    [
      {
        startStyle: {},
        finalStyle: {},
      },
      {
        startStyle: { width: 200 },
        finalStyle: { width: 100 },
      },
    ] as Array<{
      startStyle: AnimatableValueObject;
      finalStyle: AnimatableValueObject;
    }>
  ).forEach(({ startStyle, finalStyle }) => {
    test(`Animate style FROM ${startStyle} TO ${finalStyle}`, async () => {
      await render(
        <TestComponent startStyle={startStyle} finalStyle={finalStyle} />
      );

      Object.keys(startStyle).forEach(async (styleKey) => {
        console.log(styleKey);

        const component = getTestComponent(COMPONENT_REF);
        expect(await component.getAnimatedStyle(styleKey)).toBe(
          '#ff7f50',
          ComparisonMode.AUTO
        );
        await wait(1000);

        expect(await component.getAnimatedStyle(styleKey)).toBe(
          '#6495ed',
          ComparisonMode.COLOR
        );
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
