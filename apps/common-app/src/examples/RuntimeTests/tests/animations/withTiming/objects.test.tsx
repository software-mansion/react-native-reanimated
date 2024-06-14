import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { AnimatableValueObject } from 'react-native-reanimated';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import type { ValidPropNames } from '../../../ReanimatedRuntimeTestsRunner/types';
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

const AnimatedComponent = ({
  startStyle,
  finalStyle,
}: {
  startStyle: AnimatableValueObject;
  finalStyle: AnimatableValueObject;
}) => {
  const svStyle = useSharedValue(startStyle);
  const ref = useTestRef(COMPONENT_REF);

  const style = useAnimatedStyle(() => {
    return svStyle.value;
  });

  useEffect(() => {
    svStyle.value = withDelay(100, withTiming(finalStyle, { duration: 900 }));
  });

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, style]} />
    </View>
  );
};

describe('withTiming animation of WIDTH', () => {
  const comparisonModes = {
    zIndex: ComparisonMode.NUMBER,
    opacity: ComparisonMode.NUMBER,
    width: ComparisonMode.DISTANCE,
    height: ComparisonMode.DISTANCE,
    top: ComparisonMode.DISTANCE,
    left: ComparisonMode.DISTANCE,
    backgroundColor: ComparisonMode.COLOR,
  };

  test.each([
    {
      startStyle: { width: 10 },
      finalStyle: { width: 100 },
    },
    {
      startStyle: { width: 10, height: 10, backgroundColor: 'orange' },
      finalStyle: { width: 100, height: 100, backgroundColor: 'peru' },
    },
    {
      startStyle: { width: 10, left: 10, top: 10, backgroundColor: 'aqua' },
      finalStyle: { width: 100, left: 100, top: 100, backgroundColor: 'teal' },
    },
    {
      startStyle: { opacity: 1, backgroundColor: '#AA3456' },
      finalStyle: { opacity: 0.1, backgroundColor: '#AAAAFF' },
    },
    {
      startStyle: { opacity: 1, backgroundColor: '#AA3456AB' },
      finalStyle: { opacity: 0.1, backgroundColor: '#AAAAFFFD' },
    },
  ])(
    'Animate\tfrom \t${startStyle}\n\t\tto\t${finalStyle}',
    async ({ startStyle, finalStyle }: { startStyle: any; finalStyle: any }) => {
      await render(<AnimatedComponent startStyle={startStyle} finalStyle={finalStyle} />);
      const component = getTestComponent(COMPONENT_REF);
      await wait(1000);
      for (const key of Object.keys(finalStyle)) {
        expect(await component.getAnimatedStyle(key as ValidPropNames)).toBe(
          finalStyle[key],
          comparisonModes[key as keyof typeof comparisonModes],
        );
      }
    },
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  box: {
    height: 100,
    width: 100,
    margin: 30,
  },
});
