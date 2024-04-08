import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
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

const ColorComponent = ({
  color1,
  color2,
}: {
  color1: string | number;
  color2: string | number;
}) => {
  const colorSV = useSharedValue(color1);
  const ref = useTestRef('ColorComponent');

  // @ts-ignore number is not a valid color
  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: withDelay(
        100,
        withTiming(colorSV.value, { duration: 400 })
      ),
    };
  });

  useEffect(() => {
    colorSV.value = color2;
  }, [colorSV, color2]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.animatedBox, style]} />
    </View>
  );
};

describe('withTiming animation of COLOR 🎨', () => {
  const OPAQUE_COLORS = [
    [0x6495ed, 'number'],
    ['rgb(100,149,237)', 'rgb'],
    ['rgba(100,149,237,1)', 'rgba'],
    ['#6495ed', 'hex'],
    ['#6495ED', 'UPPERCASE hex'],
    ['#6495edff', 'hex with opacity'],
    ['hsl(218.5, 79%, 66%)', 'hsl'],
    ['cornflowerblue', 'color name'],
  ];

  OPAQUE_COLORS.forEach((testCase) => {
    const [color, colorType] = testCase;
    test(`Animate FROM color as ${colorType} "${color}"`, async () => {
      await render(<ColorComponent color1={color} color2="coral" />);
      const component = getTestComponent('ColorComponent');
      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        '#6495ed',
        ComparisonMode.COLOR
      );
      await wait(1000);

      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        '#ff7f50',
        ComparisonMode.COLOR
      );
    });
  });

  OPAQUE_COLORS.forEach((testCase) => {
    const [color, colorType] = testCase;
    test(`Animate TO color as ${colorType} string "${color}"`, async () => {
      await render(<ColorComponent color1="coral" color2={color} />);
      const component = getTestComponent('ColorComponent');
      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        '#ff7f50',
        ComparisonMode.COLOR
      );
      await wait(1000);

      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        '#6495ed',
        ComparisonMode.COLOR
      );
    });
  });

  (
    [
      {
        from: '#6495edab',
        fromHex: '#6495edab',
        to: '#ff7f50ab',
        toHex: '#ff7f50ab',
      },
      { from: '#6495ed', fromHex: '#6495ed', to: '#1b1', toHex: '#11bb11' },
      {
        from: 'rgba(100,149,237,0.67)',
        fromHex: '#6495edab',
        to: '#1b1',
        toHex: '#11bb11',
      },
      {
        from: '#1b1',
        fromHex: '#11bb11',
        to: 'rgba(100,149,237,0.67)',
        toHex: '#6495edab',
      },
      { from: '#5bc', fromHex: '#55bbcc', to: '#ff7f50', toHex: '#ff7f50' },
      { from: '#5bc', fromHex: '#55bbcc', to: '#1b1', toHex: '#11bb11' },
    ] as const
  ).forEach(({ from, to, fromHex, toHex }) => {
    test(`Animate from ${from} to ${to}"`, async () => {
      await render(<ColorComponent color1={from} color2={to} />);
      const component = getTestComponent('ColorComponent');
      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        fromHex,
        ComparisonMode.COLOR
      );
      await wait(1000);

      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        toHex,
        ComparisonMode.COLOR
      );
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
    margin: 30,
  },
});
