import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitUntilSettled,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

const DELAY = 100;
const DURATION = 400;

const COMPONENT_REF_ACTIVE = 'ColorComponentActive';
const COMPONENT_REF_PASSIVE = 'ColorComponentPassive';

const ColorComponent = ({
  color1,
  color2,
}: {
  color1: string | number;
  color2: string | number;
}) => {
  const colorActiveSV = useSharedValue(color1);
  const colorPassiveSV = useSharedValue(color1);

  const refActive = useTestRef(COMPONENT_REF_ACTIVE);
  const refPassive = useTestRef(COMPONENT_REF_PASSIVE);

  // @ts-ignore - number is not a valid color without react-native-strict-api enabled
  const styleActive = useAnimatedStyle(() => {
    return {
      backgroundColor: withDelay(
        DELAY,
        withTiming(colorActiveSV.value, { duration: DURATION })
      ),
    };
  });

  // @ts-ignore - number is not a valid color without react-native-strict-api enabled
  const stylePassive = useAnimatedStyle(() => {
    return {
      backgroundColor: colorPassiveSV.value,
    };
  });

  useEffect(() => {
    colorActiveSV.value = color2;
  }, [colorActiveSV, color2]);

  useEffect(() => {
    colorPassiveSV.value = withDelay(
      DELAY,
      withTiming(color2, { duration: DURATION })
    );
  }, [colorPassiveSV, color2]);

  return (
    <View style={styles.container}>
      <Animated.View
        ref={refActive}
        style={[styles.animatedBox, styleActive]}
      />
      <Animated.View
        ref={refPassive}
        style={[styles.animatedBox, stylePassive]}
      />
    </View>
  );
};

// The effects start the animations on the UI thread, before the clock moves.
async function renderWithHeldClock(
  color1: string | number,
  color2: string | number
) {
  await mockAnimationTimer({ autoAdvance: false });
  await render(<ColorComponent color1={color1} color2={color2} />);
  await waitForFrames(3);
}

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

  test.each(OPAQUE_COLORS)('Animate FROM color as %s', async (color) => {
    await renderWithHeldClock(color, 'coral');
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);
    await advanceAnimationTimer(DELAY / 2);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe(
      '#6495ed',
      ComparisonMode.COLOR
    );
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      '#6495ed',
      ComparisonMode.COLOR
    );
    await advanceAnimationTimer(DELAY / 2);
    await advanceAnimationTimer(DURATION);
    await expectEventually(() =>
      componentActive.getAnimatedStyle('backgroundColor')
    ).toBe('#ff7f50', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      '#ff7f50',
      ComparisonMode.COLOR
    );
  });

  test.each(OPAQUE_COLORS)('Animate TO color as %s', async (color) => {
    await renderWithHeldClock('coral', color);
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);
    await advanceAnimationTimer(DELAY / 2);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe(
      '#ff7f50',
      ComparisonMode.COLOR
    );
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      '#ff7f50',
      ComparisonMode.COLOR
    );
    await advanceAnimationTimer(DELAY / 2);
    await advanceAnimationTimer(DURATION);
    await expectEventually(() =>
      componentActive.getAnimatedStyle('backgroundColor')
    ).toBe('#6495ed', ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      '#6495ed',
      ComparisonMode.COLOR
    );
  });

  test("Animating colors as number doesn't work and doesn't crash", async () => {
    await render(<ColorComponent color1="coral" color2={0x6495ed} />);
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe(
      '#ff7f50',
      ComparisonMode.COLOR
    );
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      '#ff7f50',
      ComparisonMode.COLOR
    );
    const settledActive = await waitUntilSettled(() =>
      componentActive.getAnimatedStyle('backgroundColor')
    );
    const settledPassive = await waitUntilSettled(() =>
      componentPassive.getAnimatedStyle('backgroundColor')
    );

    expect(settledActive).not.toBe('#6495ed', ComparisonMode.COLOR);
    expect(settledPassive).not.toBe('#6495ed', ComparisonMode.COLOR);
  });

  test.each([
    { from: '#6495ed', to: '#ff7f50' },
    { from: '#6495edab', to: '#ff7f50ab' },
    { from: '#6495ed', to: '#1b1' },
    { from: 'rgba(100,149,237,0.67)', to: '#1b1' },
    { from: '#1b1', to: 'rgba(100,149,237,0.67)' },
    { from: '#5bc', to: '#ff7f50' },
    { from: '#5bc', to: '#1b1' },
  ])('Animate from ${from} to ${to}', async ({ from, to }) => {
    await renderWithHeldClock(from, to);
    const componentActive = getTestComponent(COMPONENT_REF_ACTIVE);
    const componentPassive = getTestComponent(COMPONENT_REF_PASSIVE);
    await advanceAnimationTimer(DELAY / 2);

    expect(await componentActive.getAnimatedStyle('backgroundColor')).toBe(
      from,
      ComparisonMode.COLOR
    );
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      from,
      ComparisonMode.COLOR
    );
    await advanceAnimationTimer(DELAY / 2);
    await advanceAnimationTimer(DURATION);
    await expectEventually(() =>
      componentActive.getAnimatedStyle('backgroundColor')
    ).toBe(to, ComparisonMode.COLOR);
    expect(await componentPassive.getAnimatedStyle('backgroundColor')).toBe(
      to,
      ComparisonMode.COLOR
    );
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
