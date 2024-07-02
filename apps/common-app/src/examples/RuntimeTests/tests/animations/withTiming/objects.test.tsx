import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { AnimatableValueObject } from 'react-native-reanimated';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { ComparisonMode } from '../../../ReanimatedRuntimeTestsRunner/types';
import type { ValidPropNames } from '../../../ReanimatedRuntimeTestsRunner/types';
import {
  describe,
  test,
  expect,
  render,
  useTestRef,
  getTestComponent,
  wait,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { getComparisonModeForProp } from '../../../ReanimatedRuntimeTestsRunner/matchers/Comparators';

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

describe('withTiming animation of style object', () => {
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
    'Animate from **${startStyle}** to **${finalStyle}**',
    async ({ startStyle, finalStyle }: { startStyle: any; finalStyle: any }) => {
      await render(<AnimatedComponent startStyle={startStyle} finalStyle={finalStyle} />);
      const component = getTestComponent(COMPONENT_REF);
      const startTopValue = await component.getAnimatedStyle('top');

      await wait(1000);
      for (const key of Object.keys(finalStyle)) {
        // This value may rely on height of the header, depending on the platform
        // Therefore we want to check that the difference between final and start values of "top" property
        // match our expectations
        if (key === 'top') {
          expect((await component.getAnimatedStyle('top')) - startTopValue).toBe(
            finalStyle.top - startStyle.top,
            ComparisonMode.DISTANCE,
          );
        } else {
          expect(await component.getAnimatedStyle(key as ValidPropNames)).toBe(
            finalStyle[key],
            getComparisonModeForProp(key as ValidPropNames),
          );
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
  box: {
    height: 100,
    width: 100,
    margin: 0,
  },
});
