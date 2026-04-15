import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Rect, type RectProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function RectExample() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes<RectProps> }, RectProps>
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '0.5s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} width={100}>
          <AnimatedRect
            animatedProps={animation}
            fill={colors.primary}
            height={60}
            width={60}
            x={20}
            y={20}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Position',
          sections: [
            {
              examples: [
                {
                  description: 'Animates from default `x=20` to `x=50`',
                  keyframes: {
                    to: {
                      x: 50,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      x: '10%',
                    },
                    to: {
                      x: '50%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      x: 20,
                    },
                    to: {
                      x: '50%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'X Position',
            },
            {
              examples: [
                {
                  description: 'Animates from default `y=20` to `y=50`',
                  keyframes: {
                    to: {
                      y: 50,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      y: '10%',
                    },
                    to: {
                      y: '50%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      y: 20,
                    },
                    to: {
                      y: '50%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Y Position',
            },
          ],
        },
        {
          name: 'Size',
          sections: [
            {
              examples: [
                {
                  description: 'Animates from default `width=60` to `width=80`',
                  keyframes: {
                    from: {
                      height: 0,
                      width: 0,
                    },
                    to: {
                      height: 80,
                      width: 80,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      height: '0%',
                      width: '0%',
                    },
                    to: {
                      height: '70%',
                      width: '70%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      width: 60,
                    },
                    to: {
                      width: '70%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Width',
            },
            {
              examples: [
                {
                  description:
                    'Animates from default `height=60` to `height=80`',
                  keyframes: {
                    to: {
                      height: 80,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      height: '30%',
                    },
                    to: {
                      height: '70%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      height: 60,
                    },
                    to: {
                      height: '70%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Height',
            },
          ],
        },
        {
          name: 'Corners',
          sections: [
            {
              examples: [
                {
                  description: 'Animates from default `rx=0` to `rx=20`',
                  keyframes: {
                    to: {
                      rx: 20,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      rx: '5%',
                    },
                    to: {
                      rx: '20%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      rx: 5,
                    },
                    to: {
                      rx: '20%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Horizontal Radius (rx)',
            },
            {
              examples: [
                {
                  description: 'Animates from default `ry=0` to `ry=20`',
                  keyframes: {
                    to: {
                      ry: 20,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      ry: '5%',
                    },
                    to: {
                      ry: '20%',
                    },
                  },
                  title: 'Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      ry: 5,
                    },
                    to: {
                      ry: '20%',
                    },
                  },
                  title: 'Mixed',
                },
              ],
              title: 'Vertical Radius (ry)',
            },
          ],
        },
        {
          name: 'Appearance',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      opacity: 0,
                    },
                  },
                  title: 'Opacity',
                },
              ],
              title: 'Opacity',
            },
          ],
        },
      ]}
    />
  );
}
