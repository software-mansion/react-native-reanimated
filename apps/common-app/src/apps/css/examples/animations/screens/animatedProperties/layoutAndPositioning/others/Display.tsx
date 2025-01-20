import { StyleSheet } from 'react-native';
import type {
  CSSAnimationDelay,
  CSSAnimationKeyframes,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function Display() {
  return (
    <ExamplesScreen<{
      keyframes: CSSAnimationKeyframes;
      animationDelay?: CSSAnimationDelay;
    }>
      buildAnimation={({ animationDelay, keyframes }) => ({
        animationDelay,
        animationDuration: '1s',
        animationFillMode: 'both',
        animationName: keyframes,
        animationTimingFunction: 'easeOut',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[animation, styles.box]} />
      )}
      sections={[
        {
          description: [
            'The `display` property animation follows special rules that distinguish it from other discrete properties:',
            '1. When animating **from** `display: none`: The new display value is applied immediately at the start',
            '2. When animating **to** `display: none`: The original value is preserved until reaching the keyframe with `display: none`',
            'This behavior is particularly useful when we want to keep the element removed from the layout before the animation starts or after it finishes. Display property animation is commonly used with animation of `opacity` or `scale`.',
          ],
          examples: [
            {
              animationDelay: '1s',
              keyframes: {
                from: {
                  display: 'none',
                  transform: [
                    {
                      translateY: '-100%',
                    },
                  ],
                },
              },
              showRestartButton: true,
              title: 'From display none',
            },
            {
              keyframes: {
                to: {
                  display: 'none',
                  transform: [
                    {
                      translateY: '100%',
                    },
                  ],
                },
              },
              showRestartButton: true,
              title: 'To display none',
            },
          ],
          title: 'Display',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
});
