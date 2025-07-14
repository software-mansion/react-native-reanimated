import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

export default function ColumnGap() {
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
        <Animated.View style={[styles.container, animation]}>
          {Array.from({ length: 9 }).map((_, index) => (
            <View key={index} style={[styles.box]} />
          ))}
        </Animated.View>
      )}
      tabs={[
        {
          name: 'Absolute',
          sections: [
            {
              examples: [
                {
                  description:
                    'We can use absolute values for the `columnGap` property.',
                  keyframes: {
                    from: {
                      columnGap: 0,
                    },
                    to: {
                      columnGap: spacing.sm,
                    },
                  },
                },
              ],
              title: 'Absolute Column Gap',
            },
          ],
        },
        {
          name: 'Relative',
          sections: [
            {
              examples: [
                {
                  description:
                    "We can use relative values for the `columnGap` property. They are relative to the parent's container `width`.",
                  keyframes: {
                    from: {
                      columnGap: '2%',
                    },
                    to: {
                      columnGap: '10%',
                    },
                  },
                },
              ],
              title: 'Relative Column Gap',
            },
          ],
        },
        {
          name: 'Mixed',
          sections: [
            {
              examples: [
                {
                  description:
                    'We can use a mix of absolute and relative values for the `columnGap` property. Relative values are calculated based on the parent container `width`.',
                  keyframes: {
                    from: {
                      columnGap: spacing.xs,
                    },
                    to: {
                      columnGap: '10%',
                    },
                  },
                },
              ],
              title: 'Mixed Column Gap',
            },
          ],
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
  container: {
    ...flex.center,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3.99 * sizes.md,
  },
});
