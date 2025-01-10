import { StyleSheet, View } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, flex, radius, sizes, spacing } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

const MIN_EXAMPLE_HEIGHT = 3.5 * sizes.md;

export default function Gap() {
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
          {Array.from({ length: 6 }).map((_, index) => (
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
                    'We can use absolute values for the `gap` property.',
                  keyframes: {
                    from: {
                      gap: 0,
                    },
                    to: {
                      gap: spacing.sm,
                    },
                  },
                  minExampleHeight: MIN_EXAMPLE_HEIGHT,
                },
              ],
              title: 'Absolute Gap',
            },
          ],
        },
        {
          name: 'Relative',
          sections: [
            {
              description:
                'Relative `gap` works different for rows on **web** than on **mobile**. It is not a reanimated bug, it is a difference in how the browser and the native platform handle the `gap` property.',
              examples: [
                {
                  description:
                    "We can use relative values for the `gap` property. They are relative to the parent's container `width` and `height` respectively.",
                  keyframes: {
                    from: {
                      gap: '2%',
                    },
                    to: {
                      gap: '10%',
                    },
                  },
                  minExampleHeight: MIN_EXAMPLE_HEIGHT,
                },
              ],
              title: 'Relative Gap',
            },
          ],
        },
        {
          name: 'Mixed',
          sections: [
            {
              description:
                'Relative `gap` works different for rows on **web** than on **mobile**. It is not a reanimated bug, it is a difference in how the browser and the native platform handle the `gap` property.',
              examples: [
                {
                  description:
                    'We can use a mix of absolute and relative values for the `gap` property. Relative values are calculated based on the parent container `width` and `height` respectively.',
                  keyframes: {
                    from: {
                      gap: spacing.xs,
                    },
                    to: {
                      gap: '10%',
                    },
                  },
                  minExampleHeight: MIN_EXAMPLE_HEIGHT,
                },
              ],
              title: 'Mixed Gap',
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
