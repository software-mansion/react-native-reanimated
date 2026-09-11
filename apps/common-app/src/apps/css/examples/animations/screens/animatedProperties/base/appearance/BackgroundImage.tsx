/* eslint-disable camelcase */
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
                    'Gradients with the same number of color stops are interpolated smoothly - colors, stop positions and the gradient angle all animate.',
                  keyframes: {
                    from: {
                      experimental_backgroundImage:
                        'linear-gradient(0deg, red, blue)',
                    },
                    to: {
                      experimental_backgroundImage:
                        'linear-gradient(180deg, yellow, green)',
                    },
                  },
                  title: 'CSS string syntax',
                },
                {
                  description:
                    'The same gradient animation can be written with the object syntax.',
                  keyframes: {
                    from: {
                      experimental_backgroundImage: [
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
                      experimental_backgroundImage: [
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
                      experimental_backgroundImage:
                        'linear-gradient(red, blue)',
                    },
                    to: {
                      experimental_backgroundImage:
                        'linear-gradient(red, yellow, blue)',
                    },
                  },
                  title: 'Different number of color stops',
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
                      experimental_backgroundImage:
                        'radial-gradient(circle 60px at 25% 25%, yellow, red)',
                    },
                    to: {
                      experimental_backgroundImage:
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
