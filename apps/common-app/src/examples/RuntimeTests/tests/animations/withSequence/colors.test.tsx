import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import {
  describe,
  test,
  render,
  wait,
  useTestRef,
  getTestComponent,
  expect,
} from '../../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { View, StyleSheet } from 'react-native';
import { ComparisonMode } from '../../../ReanimatedRuntimeTestsRunner/types';

type TestCase = {
  startColor: string;
  middleColor: string;
  finalColor: string;
};

describe('withSequence animation of number', () => {
  enum Component {
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
  }
  const DELAY = 75;
  const WidthComponent = ({ startColor, middleColor, finalColor }: TestCase) => {
    const colorActiveSV = useSharedValue(startColor);
    const colorPassiveSV = useSharedValue(startColor);

    const refActive = useTestRef(Component.ACTIVE);
    const refPassive = useTestRef(Component.PASSIVE);

    const styleActive = useAnimatedStyle(() => {
      return {
        backgroundColor: withSequence(
          withDelay(DELAY, withTiming(colorActiveSV.value, { duration: 200 })),
          withDelay(DELAY, withTiming(middleColor, { duration: 300 })),
          withDelay(DELAY, withTiming(colorActiveSV.value, { duration: 200 })),
        ),
      };
    });
    const stylePassive = useAnimatedStyle(() => {
      return {
        backgroundColor: colorPassiveSV.value,
      };
    });

    useEffect(() => {
      colorActiveSV.value = finalColor;
    }, [colorActiveSV, finalColor]);

    useEffect(() => {
      colorPassiveSV.value = withSequence(
        withDelay(DELAY, withTiming(finalColor, { duration: 200 })),
        withDelay(DELAY, withTiming(middleColor, { duration: 300 })),
        withDelay(DELAY, withTiming(finalColor, { duration: 200 })),
      );
    }, [colorPassiveSV, finalColor, middleColor]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refActive} style={[styles.animatedBox, styleActive]} />
        <Animated.View ref={refPassive} style={[styles.animatedBox, stylePassive]} />
      </View>
    );
  };

  test.each([
    {
      startColor: 'gold',
      startColorHex: '#ffd700ff',
      middleColor: 'forestgreen',
      middleColorHex: '#228b22ff',
      finalColor: 'darkblue',
      finalColorHex: '#00008bff',
    },
    {
      startColor: '#ffd700ab',
      startColorHex: '#ffd700ab',
      middleColor: 'forestgreen',
      middleColorHex: '#228b22ff',
      finalColor: 'darkblue',
      finalColorHex: '#00008bff',
    },
    {
      startColor: '#ffd700ab',
      startColorHex: '#ffd700ab',
      middleColor: 'forestgreen',
      middleColorHex: '#228b22',
      finalColor: '#88bbcc44',
      finalColorHex: '#88bbcc44',
    },
    {
      startColor: 'gold',
      startColorHex: '#ffd700ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'hsl(120,100%,50%)',
      finalColorHex: '#00ff00ff',
    },
    {
      startColor: 'gold',
      startColorHex: '#ffd700ff',
      middleColor: 'hsl(70, 100%, 75%)',
      middleColorHex: '#eaff80ff',
      finalColor: 'hsl(120,100%,50%)',
      finalColorHex: '#00ff00ff',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      startColorHex: '#eaff80ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'hsl(120,100%,50%)',
      finalColorHex: '#00ff00ff',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      startColorHex: '#eaff80ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'hsl(120,100%,50%)',
      finalColorHex: '#00ff00ff',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      startColorHex: '#eaff80ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'rgb(101,255,50)',
      finalColorHex: '#65ff32ff',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      startColorHex: '#eaff80ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'hsla( 120 , 100% , 50%, 0.5 )',
      finalColorHex: '#00ff0080',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      startColorHex: '#eaff80ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'rgb(101,255,50)',
      finalColorHex: '#65ff32ff',
    },
    {
      startColor: 'hwb(70, 50%, 0%)',
      startColorHex: '#eaff80ff',
      middleColor: 'hsl(180, 50%, 50%)',
      middleColorHex: '#40bfbfff',
      finalColor: 'rgba(100,255,50,0.5)',
      finalColorHex: '#64ff3280',
    },
  ])(
    'Animate ${startColor} → ${finalColor} → ${middleColor} → ${finalColor}',
    async ({ startColor, startColorHex, middleColor, middleColorHex, finalColor, finalColorHex }) => {
      await render(<WidthComponent startColor={startColor} middleColor={middleColor} finalColor={finalColor} />);
      const activeComponent = getTestComponent(Component.ACTIVE);
      const passiveComponent = getTestComponent(Component.PASSIVE);

      await wait(DELAY / 2);
      // TODO Decide what should be the starting value of activeComponent
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).not.toBe(startColorHex, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(startColorHex, ComparisonMode.COLOR);
      await wait(200 + DELAY);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(finalColorHex, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(finalColorHex, ComparisonMode.COLOR);
      await wait(300 + DELAY);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(middleColorHex, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(middleColorHex, ComparisonMode.COLOR);
      await wait(200 + DELAY);
      expect(await activeComponent.getAnimatedStyle('backgroundColor')).toBe(finalColorHex, ComparisonMode.COLOR);
      expect(await passiveComponent.getAnimatedStyle('backgroundColor')).toBe(finalColorHex, ComparisonMode.COLOR);
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
    borderRadius: 10,
    margin: 30,
  },
});
