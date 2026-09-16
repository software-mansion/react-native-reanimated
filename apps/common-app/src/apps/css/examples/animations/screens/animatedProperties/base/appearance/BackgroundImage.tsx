import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { radius, sizes } from '@/theme';

export default function BackgroundImage() {
  return (
    <ExamplesScreen<ViewStyle, { keyframes: CSSAnimationKeyframes<ViewStyle> }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      tabs={[
        {
          name: 'Linear Gradient',
          sections: [
            {
              examples: [
                {
                  description:
                    'Gradients of the same type with the same kind of direction and the same number of color stops are interpolated smoothly - colors, stop positions and the gradient angle all animate.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(0deg, red, blue)',
                    },
                    to: {
                      backgroundImage: 'linear-gradient(180deg, yellow, green)',
                    },
                  },
                  title: 'CSS string syntax',
                },
                {
                  description:
                    'Gradients can also be written with the object syntax.',
                  keyframes: {
                    from: {
                      backgroundImage: [
                        {
                          colorStops: [
                            { color: 'red', positions: ['0%'] },
                            { color: 'blue', positions: ['50%'] },
                          ],
                          direction: '45deg',
                          type: 'linear-gradient',
                        },
                      ],
                    },
                    to: {
                      backgroundImage: [
                        {
                          colorStops: [
                            { color: 'blue', positions: ['50%'] },
                            { color: 'red', positions: ['100%'] },
                          ],
                          direction: '45deg',
                          type: 'linear-gradient',
                        },
                      ],
                    },
                  },
                  title: 'Object syntax',
                },
              ],
              title: 'Smooth interpolation',
            },
            {
              examples: [
                {
                  description:
                    'Gradients with a different number of color stops cannot be interpolated smoothly, so the value flips discretely in the middle of the animation.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(red, blue)',
                    },
                    to: {
                      backgroundImage: 'linear-gradient(red, yellow, blue)',
                    },
                  },
                  title: 'Different number of color stops',
                },
                {
                  description:
                    "A keyframe without backgroundImage starts from the view's own gradient. Without one, the gradient appears in the middle of the animation.",
                  keyframes: {
                    to: {
                      backgroundImage: 'linear-gradient(90deg, red, blue)',
                    },
                  },
                  title: 'From no gradient',
                },
                {
                  description:
                    'An explicit "none" keyframe removes the gradient; the value changes discretely in the middle of the animation.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(90deg, red, blue)',
                    },
                    to: {
                      backgroundImage: 'none',
                    },
                  },
                  title: 'To no gradient',
                },
              ],
              title: 'Discrete interpolation',
            },
          ],
        },
        {
          name: 'Radial Gradient',
          sections: [
            {
              examples: [
                {
                  description:
                    'Radial gradient colors, sizes and positions are interpolated smoothly when both gradients have the same shape and compatible units.',
                  keyframes: {
                    from: {
                      backgroundImage:
                        'radial-gradient(circle 60px at 25% 25%, yellow, red)',
                    },
                    to: {
                      backgroundImage:
                        'radial-gradient(circle 120px at 75% 75%, blue, green)',
                    },
                  },
                  title: 'Moving highlight',
                },
              ],
              title: 'Smooth interpolation',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    height: sizes.xl,
    width: sizes.xl,
  },
});
