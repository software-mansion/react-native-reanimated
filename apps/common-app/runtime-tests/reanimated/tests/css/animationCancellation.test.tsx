import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';

const ANIMATED_REF = 'CSSAnimationCancellationAnimated';
const REFERENCE_REF = 'CSSAnimationCancellationReference';

const ROTATION_ANIMATION = {
  animationName: {
    from: { width: 40, opacity: 0, transform: [{ rotate: '0deg' }] },
    to: { width: 120, opacity: 1, transform: [{ rotate: '360deg' }] },
  },
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
} as const;

type CancellationMode = 'none' | 'removed';

async function expectAnimatedStyleToMatchReference() {
  const animated = getTestComponent(ANIMATED_REF);
  const reference = getTestComponent(REFERENCE_REF);

  expect(await animated.getAnimatedStyle('width')).toBe(
    await reference.getAnimatedStyle('width')
  );
  expect(await animated.getAnimatedStyle('opacity')).toBe(
    await reference.getAnimatedStyle('opacity')
  );
}

function CancellationTest({
  cancelled,
  mode,
  underlyingWidth = cancelled ? 96 : 80,
  underlyingOpacity = cancelled ? 0.7 : 0.4,
  underlyingRotation = cancelled ? '45deg' : '10deg',
}: {
  cancelled: boolean;
  mode: CancellationMode;
  underlyingWidth?: number;
  underlyingOpacity?: number;
  underlyingRotation?: `${number}deg`;
}) {
  const animatedRef = useTestRef(ANIMATED_REF);
  const referenceRef = useTestRef(REFERENCE_REF);

  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={[
          styles.box,
          {
            width: underlyingWidth,
            opacity: underlyingOpacity,
            transform: [{ rotate: underlyingRotation }],
          },
          cancelled
            ? mode === 'none'
              ? { animationName: 'none' }
              : null
            : ROTATION_ANIMATION,
        ]}
      />
      <Animated.View
        ref={referenceRef}
        style={[
          styles.box,
          {
            width: underlyingWidth,
            opacity: underlyingOpacity,
            transform: [{ rotate: underlyingRotation }],
          },
        ]}
      />
    </View>
  );
}

describe('CSS animation cancellation', () => {
  test.each<CancellationMode>(['none', 'removed'])(
    'restores the current underlying style when animation styles are %s',
    async (mode) => {
      await render(<CancellationTest cancelled={false} mode={mode} />);
      await wait(100);
      const firstAnimatedWidth =
        await getTestComponent(ANIMATED_REF).getAnimatedStyle('width');
      await wait(150);
      expect(
        await getTestComponent(ANIMATED_REF).getAnimatedStyle('width')
      ).not.toBe(firstAnimatedWidth);

      await render(<CancellationTest cancelled mode={mode} />);
      await wait(100);

      // This assertion intentionally happens without an extra React commit.
      // Width uses the layout mutation path, so unlike direct native props its
      // shadow-node value is a valid oracle with the Animation Backend.
      await expectAnimatedStyleToMatchReference();

      // The reset is a one-shot mutation, not persistent CSS ownership. A
      // later plain style update must therefore become visible as usual.
      await render(
        <CancellationTest
          cancelled
          mode={mode}
          underlyingWidth={60}
          underlyingOpacity={0.2}
          underlyingRotation="20deg"
        />
      );
      await wait(100);

      await expectAnimatedStyleToMatchReference();

      await render(<CancellationTest cancelled={false} mode={mode} />);
      await wait(100);
      const restartedAnimatedWidth =
        await getTestComponent(ANIMATED_REF).getAnimatedStyle('width');
      await wait(150);
      expect(
        await getTestComponent(ANIMATED_REF).getAnimatedStyle('width')
      ).not.toBe(restartedAnimatedWidth);
    }
  );
});

const styles = StyleSheet.create({
  box: {
    height: 40,
    margin: 20,
    backgroundColor: 'royalblue',
  },
});
