import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const MIN_EXAMPLE_HEIGHT = 6 * sizes.md;

export default function RowGap() {
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
                    'We can use absolute values for the `rowGap` property.',
                  keyframes: {
                    from: {
                      rowGap: 0,
                    },
                    to: {
                      rowGap: spacing.sm,
                    },
                  },
                  minExampleHeight: MIN_EXAMPLE_HEIGHT,
                },
              ],
              title: 'Absolute Row Gap',
            },
          ],
        },
        {
          name: 'Relative',
          sections: [
            {
              description:
                'Relative `rowGap` works different on **web** than on **mobile**. It is not a reanimated bug, it is a difference in how the browser and the native platform handle the `rowGap` property.',
              examples: [
                {
                  description:
                    "We can use relative values for the `rowGap` property. They are relative to the parent's container `height`.",
                  keyframes: {
                    from: {
                      rowGap: '2%',
                    },
                    to: {
                      rowGap: '10%',
                    },
                  },
                  minExampleHeight: MIN_EXAMPLE_HEIGHT,
                },
              ],
              title: 'Relative Row Gap',
            },
          ],
        },
        {
          name: 'Mixed',
          sections: [
            {
              description:
                'Relative `rowGap` works different on **web** than on **mobile**. It is not a reanimated bug, it is a difference in how the browser and the native platform handle the `rowGap` property.',
              examples: [
                {
                  description:
                    'We can use a mix of absolute and relative values for the `rowGap` property. Relative values are calculated based on the parent container `height`.',
                  keyframes: {
                    from: {
                      rowGap: spacing.xs,
                    },
                    to: {
                      rowGap: '10%',
                    },
                  },
                  minExampleHeight: MIN_EXAMPLE_HEIGHT,
                },
              ],
              title: 'Mixed Row Gap',
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
