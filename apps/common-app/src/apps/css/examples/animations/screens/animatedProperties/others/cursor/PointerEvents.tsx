import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PointerEvents() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[animation]}>
          <JumpingBox />
        </Animated.View>
      )}
      sections={[
        {
          examples: [
            {
              description: [
                "`pointerEvents` is a **discrete** property. That means, it **can't be smoothly animated** between values.",
                '',
                'Press the box to test if the animation works. If `pointerEvents` is set to `auto`, the box will jump. If it is set to `none`, the box will not jump.',
              ],
              keyframes: {
                from: {
                  pointerEvents: 'auto',
                },
                to: {
                  pointerEvents: 'none',
                },
              },
              title: 'Changing Pointer Events',
            },
          ],
          title: 'Pointer Events',
        },
      ]}
    />
  );
}

function JumpingBox() {
  const [isJumping, setIsJumping] = useState(false);

  return (
    <AnimatedPressable
      style={[
        styles.box,
        {
          transform: [{ translateY: isJumping ? -spacing.lg : 0 }],
          transitionDuration: 200,
        },
      ]}
      onPressIn={() => setIsJumping(true)}
      onPressOut={() => setIsJumping(false)}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: sizes.lg,
    width: sizes.lg,
  },
});
