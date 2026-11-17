import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type {
  CSSAnimationDirection,
  CSSAnimationDuration,
  CSSAnimationKeyframes,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { colors, radius, sizes } from '@/theme';

export default function BackgroundImage() {
  return (
    <ExamplesScreen<
      ViewStyle,
      {
        keyframes: CSSAnimationKeyframes<ViewStyle>;
        animationDirection?: CSSAnimationDirection;
        animationDuration?: CSSAnimationDuration;
      }
    >
      CardComponent={VerticalExampleCard}
      buildAnimation={({
        keyframes,
        animationDirection = 'alternate',
        animationDuration = '2s',
      }) => ({
        animationDirection,
        animationDuration,
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      tabs={[
        {
          name: 'Linear',
          sections: [
            {
              examples: [
                {
                  description:
                    'Colors of the gradient stops are interpolated between keyframes.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(to right, cyan, blue)',
                    },
                    to: {
                      backgroundImage: 'linear-gradient(to right, red, yellow)',
                    },
                  },
                  title: 'Colors',
                },
                {
                  animationDirection: 'normal',
                  animationDuration: '6s',
                  description:
                    'An angle direction is interpolated numerically, so the gradient rotates a full turn. Corner keywords such as `to top right` cannot be interpolated and switch halfway through.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(0deg, cyan, blue)',
                    },
                    to: {
                      backgroundImage: 'linear-gradient(360deg, cyan, blue)',
                    },
                  },
                  title: 'Direction',
                },
                {
                  animationDirection: 'normal',
                  animationDuration: '12s',
                  description:
                    'The same rotation with hard stripe edges makes the rotation easier to inspect.',
                  keyframes: {
                    from: {
                      backgroundImage:
                        'linear-gradient(0deg, cyan 0%, cyan 20%, blue 20%, blue 40%, white 40%, white 60%, red 60%, red 80%, yellow 80%, yellow 100%)',
                    },
                    to: {
                      backgroundImage:
                        'linear-gradient(360deg, cyan 0%, cyan 20%, blue 20%, blue 40%, white 40%, white 60%, red 60%, red 80%, yellow 80%, yellow 100%)',
                    },
                  },
                  title: 'Direction (stripes)',
                },
                {
                  description:
                    'Stop positions are interpolated. A stop without a position gets one assigned the way CSS does before interpolation.',
                  keyframes: {
                    from: {
                      backgroundImage:
                        'linear-gradient(to bottom, cyan 0%, blue 10%, purple)',
                    },
                    to: {
                      backgroundImage:
                        'linear-gradient(to bottom, cyan 0%, blue 90%, purple)',
                    },
                  },
                  title: 'Stop positions',
                },
                {
                  description:
                    'Gradients with a different number of stops are interpolated too. The shorter list is extended by repeating its last stop.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(to right, cyan, blue)',
                    },
                    to: {
                      backgroundImage:
                        'linear-gradient(to right, red, yellow, lime, blue)',
                    },
                  },
                  title: 'Different number of stops',
                },
                {
                  description: 'The object syntax works the same way.',
                  keyframes: {
                    from: {
                      backgroundImage: [
                        {
                          type: 'linear-gradient',
                          direction: '45deg',
                          colorStops: [
                            { color: 'cyan', positions: ['20%'] },
                            { color: 'blue', positions: ['80%'] },
                          ],
                        },
                      ],
                    },
                    to: {
                      backgroundImage: [
                        {
                          type: 'linear-gradient',
                          direction: '135deg',
                          colorStops: [
                            { color: 'red', positions: ['0%'] },
                            { color: 'yellow', positions: ['100%'] },
                          ],
                        },
                      ],
                    },
                  },
                  title: 'Object syntax',
                },
              ],
              title: 'Linear gradient',
            },
          ],
        },
        {
          name: 'Radial',
          sections: [
            {
              examples: [
                {
                  description:
                    'The center of the gradient moves when its position is interpolated.',
                  keyframes: {
                    from: {
                      backgroundImage:
                        'radial-gradient(circle at 20% 20%, yellow, red)',
                    },
                    to: {
                      backgroundImage:
                        'radial-gradient(circle at 80% 80%, yellow, red)',
                    },
                  },
                  title: 'Position',
                },
                {
                  description:
                    'Explicit sizes are interpolated. Size keywords such as `farthest-corner` cannot be interpolated and switch halfway through.',
                  keyframes: {
                    from: {
                      backgroundImage:
                        'radial-gradient(20px 20px at center, yellow, red)',
                    },
                    to: {
                      backgroundImage:
                        'radial-gradient(80px 40px at center, yellow, red)',
                    },
                  },
                  title: 'Size',
                },
              ],
              title: 'Radial gradient',
            },
          ],
        },
        {
          name: 'Layers',
          sections: [
            {
              description: [
                'Layers are paired **by index**, so a layer that exists in only one keyframe must come **last**. It fades in from or out to **transparent**.',
                'The radial layer below exists only in the **to** keyframe. The linear layer on top is translucent, so you can see the radial one fade in underneath it.',
              ],
              examples: [
                {
                  keyframes: {
                    from: {
                      backgroundImage:
                        'linear-gradient(to right, rgba(0, 255, 255, 0.5), rgba(0, 0, 255, 0.5))',
                    },
                    to: {
                      backgroundImage:
                        'linear-gradient(to right, rgba(255, 0, 0, 0.5), rgba(255, 255, 0, 0.5)), radial-gradient(circle at 50% 50%, white, black 70%)',
                    },
                  },
                  title: 'Added layer',
                },
                {
                  description:
                    'A linear gradient and a radial gradient in the same layer cannot be interpolated, so the layer switches halfway through.',
                  keyframes: {
                    from: {
                      backgroundImage: 'linear-gradient(to right, cyan, blue)',
                    },
                    to: {
                      backgroundImage: 'radial-gradient(circle, red, yellow)',
                    },
                  },
                  title: 'Different gradient types',
                },
              ],
              title: 'Multiple layers',
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
    height: sizes.xl,
    width: sizes.xl,
  },
});
