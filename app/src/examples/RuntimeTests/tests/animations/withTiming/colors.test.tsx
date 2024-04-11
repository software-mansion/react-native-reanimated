import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
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

const COMPONENT_REF = 'ColorComponent';

const ColorComponent = ({ color1, color2 }: { color1: string | number; color2: string | number }) => {
  const colorSV = useSharedValue(color1);
  const ref = useTestRef(COMPONENT_REF);

  // @ts-ignore number is not a valid color
  const style = useAnimatedStyle(() => {
    return {
      backgroundColor: withDelay(100, withTiming(colorSV.value, { duration: 400 })),
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
    0x6495ed,
    'rgb(100,149,237)',
    'rgba(100,149,237,1)',
    '#6495ed',
    '#6495ED',
    '#6495edff',
    'hsl(218.5, 79%, 66%)',
    'cornflowerblue',
  ];

  test.each(OPAQUE_COLORS)('Animate FROM color as %s', async color => {
    await render(<ColorComponent color1={color} color2="coral" />);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('backgroundColor')).toBe('#6495ed', ComparisonMode.COLOR);
    await wait(1000);
    expect(await component.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
  });

  test.each(OPAQUE_COLORS)('Animate TO color as %s', async color => {
    await render(<ColorComponent color1="coral" color2={color} />);
    const component = getTestComponent(COMPONENT_REF);
    expect(await component.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
    await wait(1000);
    expect(await component.getAnimatedStyle('backgroundColor')).toBe('#6495ed', ComparisonMode.COLOR);
  });

  test.each([
    { from: '#6495ed', fromHex: '#6495ed', to: '#ff7f50', toHex: '#ff7f50' },
    { from: '#6495edab', fromHex: '#6495edab', to: '#ff7f50ab', toHex: '#ff7f50ab' },
    { from: '#6495ed', fromHex: '#6495ed', to: '#1b1', toHex: '#11bb11' },
    { from: 'rgba(100,149,237,0.67)', fromHex: '#6495edab', to: '#1b1', toHex: '#11bb11' },
    { from: '#1b1', fromHex: '#11bb11', to: 'rgba(100,149,237,0.67)', toHex: '#6495edab' },
    { from: '#5bc', fromHex: '#55bbcc', to: '#ff7f50', toHex: '#ff7f50' },
    { from: '#5bc', fromHex: '#55bbcc', to: '#1b1', toHex: '#11bb11' },
  ])('Animate from ${from} to ${to}', async ({ from, to, fromHex, toHex }) => {
    await render(<ColorComponent color1={from} color2={to} />);
    const component = getTestComponent(COMPONENT_REF);

    expect(await component.getAnimatedStyle('backgroundColor')).toBe(fromHex, ComparisonMode.COLOR);
    await wait(1000);

    expect(await component.getAnimatedStyle('backgroundColor')).toBe(toHex, ComparisonMode.COLOR);
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
