import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
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

const COMPONENT_REF_ACTIVE = 'ColorComponentPassive';
const COMPONENT_REF_PASSIVE = 'ColorComponentPassive';

const ColorComponent = ({ color1, color2 }: { color1: string | number; color2: string | number }) => {
  const colorActiveSV = useSharedValue(color1);
  const colorPassiveSV = useSharedValue(color1);

  const refActive = useTestRef(COMPONENT_REF_ACTIVE);
  const refPassive = useTestRef(COMPONENT_REF_PASSIVE);

  // @ts-ignore number is not a valid color
  const styleActive = useAnimatedStyle(() => {
    return {
      backgroundColor: withDelay(100, withTiming(colorActiveSV.value, { duration: 400 })),
    };
  });

  // @ts-ignore number is not a valid color
  const stylePassive = useAnimatedStyle(() => {
    return {
      backgroundColor: colorPassiveSV.value,
    };
  });

  useEffect(() => {
    colorActiveSV.value = color2;
  }, [colorActiveSV, color2]);

  useEffect(() => {
    colorPassiveSV.value = withDelay(100, withTiming(color2, { duration: 400 }));
  }, [colorPassiveSV, color2]);

  return (
    <View style={styles.container}>
      <Animated.View ref={refActive} style={[styles.animatedBox, styleActive]} />
      <Animated.View ref={refPassive} style={[styles.animatedBox, stylePassive]} />
    </View>
  );
};

describe('withTiming animation of COLOR 🎨', () => {
  const OPAQUE_COLORS = [
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
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe('#6495ed', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe('#6495ed', ComparisonMode.COLOR);
    await wait(1000);
    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
  });

  test.each(OPAQUE_COLORS)('Animate TO color as %s', async color => {
    await render(<ColorComponent color1="coral" color2={color} />);
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
    await wait(1000);
    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe('#6495ed', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe('#6495ed', ComparisonMode.COLOR);
  });

  test("Animating colors as number doesn't work and doesn't crash", async () => {
    await render(<ColorComponent color1="coral" color2={0x6495ed} />);
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe('#ff7f50', ComparisonMode.COLOR);
    await wait(1000);
    expect(await componentActive.getAnimatedStyle('backgroundColor')).not.toBe('#6495ed', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).not.toBe('#6495ed', ComparisonMode.COLOR);
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
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe(fromHex, ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(fromHex, ComparisonMode.COLOR);
    await wait(1000);
    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe(toHex, ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(toHex, ComparisonMode.COLOR);
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
