import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';
import { ExamplesScreen, VerticalExampleCard } from '~/css/components';

export default function BoxShadow() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      tabs={[
        {
          name: 'Normal',
          sections: [
            {
              examples: [
                {
                  description:
                    'All shadow properties are provided as separate values.',
                  keyframes: {
                    from: {
                      boxShadow: [
                        {
                          blurRadius: radius.md,
                          color: 'cyan',
                          offsetX: 0,
                          offsetY: 0,
                        },
                      ],
                    },
                    to: {
                      boxShadow: [
                        {
                          blurRadius: radius.lg,
                          color: 'red',
                          offsetX: spacing.lg,
                          offsetY: spacing.md,
                          spreadDistance: 10,
                        },
                      ],
                    },
                  },
                  title: 'Object syntax',
                },
                {
                  description:
                    "As you can see in this example, you don't have to use the `px` unit for length values in the shadow. It is optional.",
                  keyframes: {
                    from: {
                      boxShadow: 'cyan',
                    },
                    to: {
                      boxShadow: '50px 0 10 red',
                    },
                  },
                  title: 'String syntax',
                },
              ],
              title: 'Normal Shadow',
            },
          ],
        },
        {
          name: 'Inset',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    from: {
                      boxShadow: [
                        {
                          blurRadius: radius.md,
                          color: 'cyan',
                          inset: true,
                          offsetX: 0,
                          offsetY: 0,
                        },
                      ],
                    },
                    to: {
                      boxShadow: [
                        {
                          blurRadius: radius.lg,
                          color: 'red',
                          inset: true,
                          offsetX: spacing.lg,
                          offsetY: spacing.md,
                          spreadDistance: 10,
                        },
                      ],
                    },
                  },
                  title: 'Object syntax',
                },
                {
                  keyframes: {
                    from: {
                      boxShadow: 'inset cyan',
                    },
                    to: {
                      boxShadow: 'inset 50px 0 10 red',
                    },
                  },
                  title: 'String syntax',
                },
              ],
              title: 'Inset Shadow',
            },
          ],
        },
        {
          name: 'Multiple Shadows',
          sections: [
            {
              description: [
                'As you can see, if the **number of shadows** is **not the same**, excessive shadows will be animated to **default** values.',
                'In this example, the last shadow in the **from** keyframe is animated to default value.',
              ],
              examples: [
                {
                  keyframes: {
                    from: {
                      boxShadow: [
                        {
                          color: 'cyan',
                          offsetX: 20,
                          offsetY: 0,
                        },
                        {
                          blurRadius: 20,
                          color: 'green',
                          offsetX: 10,
                          offsetY: 10,
                        },
                        {
                          blurRadius: 50,
                          offsetX: 0,
                          offsetY: 0,
                        },
                      ],
                    },
                    to: {
                      boxShadow: [
                        {
                          color: 'red',
                          offsetX: 0,
                          offsetY: 0,
                        },
                        {
                          color: 'orange',
                          offsetX: -20,
                          offsetY: 0,
                        },
                      ],
                    },
                  },
                  title: 'Object syntax',
                },
                {
                  keyframes: {
                    from: {
                      boxShadow: '20 cyan, 10 10 20 green, 0 0 50',
                    },
                    to: {
                      boxShadow: 'red, -20 orange',
                    },
                  },
                  title: 'String syntax',
                },
              ],
              title: 'Multiple Shadows',
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
    boxShadow: [
      {
        blurRadius: radius.md,
        color: colors.primary,
        offsetX: '50px',
        offsetY: spacing.md,
      },
    ],
    height: sizes.md,
    width: sizes.md,
  },
});
