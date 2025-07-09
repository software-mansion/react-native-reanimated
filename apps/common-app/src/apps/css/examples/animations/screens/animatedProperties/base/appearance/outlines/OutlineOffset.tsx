import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

export default function OutlineOffset() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      sections={[
        {
          examples: [
            {
              keyframes: {
                from: {
                  outlineOffset: 0,
                },
                to: {
                  outlineOffset: spacing.md,
                },
              },
              title: 'Changing Outline Offset',
            },
          ],
          title: 'Outline Offset',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderRadius: radius.sm,
    height: sizes.xl,
    outlineColor: colors.primaryDark,
    outlineStyle: 'solid',
    outlineWidth: spacing.xxs,
    width: sizes.xl,
  },
});
