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
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
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
                  keyframes: {
                    to: {
                      x: 50,
                    },
                  },
                  title: 'Absolute',
                  description: 'Animates from default `x=20` to `x=50`',
                },
                {
                  keyframes: {
                    from: {
                      x: '10%',
                    },
                    to: {
                      x: '50%',
                    },
                  },
                  title: 'Percentage',
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                },
                {
                  keyframes: {
                    from: {
                      x: 20,
                    },
                    to: {
                      x: '50%',
                    },
                  },
                  title: 'Mixed',
                  description:
                    'Interpolation between absolute and relative values is **not supported** in SVG, thus the X position is changed **abruptly**',
                },
              ],
              title: 'X Position',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      y: 50,
                    },
                  },
                  title: 'Absolute',
                  description: 'Animates from default `y=20` to `y=50`',
                },
                {
                  keyframes: {
                    from: {
                      y: '10%',
                    },
                    to: {
                      y: '50%',
                    },
                  },
                  title: 'Percentage',
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                },
                {
                  keyframes: {
                    from: {
                      y: 20,
                    },
                    to: {
                      y: '50%',
                    },
                  },
                  title: 'Mixed',
                  description:
                    'Interpolation between absolute and relative values is **not supported** in SVG, thus the Y position is changed **abruptly**',
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
                  keyframes: {
                    to: {
                      width: 80,
                    },
                  },
                  title: 'Absolute',
                  description: 'Animates from default `width=60` to `width=80`',
                },
                {
                  keyframes: {
                    from: {
                      width: '30%',
                    },
                    to: {
                      width: '70%',
                    },
                  },
                  title: 'Percentage',
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                },
                {
                  keyframes: {
                    from: {
                      width: 60,
                    },
                    to: {
                      width: '70%',
                    },
                  },
                  title: 'Mixed',
                  description:
                    'Interpolation between absolute and relative values is **not supported** in SVG, thus the width is changed **abruptly**',
                },
              ],
              title: 'Width',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      height: 80,
                    },
                  },
                  title: 'Absolute',
                  description:
                    'Animates from default `height=60` to `height=80`',
                },
                {
                  keyframes: {
                    from: {
                      height: '30%',
                    },
                    to: {
                      height: '70%',
                    },
                  },
                  title: 'Percentage',
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                },
                {
                  keyframes: {
                    from: {
                      height: 60,
                    },
                    to: {
                      height: '70%',
                    },
                  },
                  title: 'Mixed',
                  description:
                    'Interpolation between absolute and relative values is **not supported** in SVG, thus the height is changed **abruptly**',
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
                  keyframes: {
                    to: {
                      rx: 20,
                    },
                  },
                  title: 'Absolute',
                  description: 'Animates from default `rx=0` to `rx=20`',
                },
                {
                  keyframes: {
                    from: {
                      rx: '5%',
                    },
                    to: {
                      rx: '20%',
                    },
                  },
                  title: 'Percentage',
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                },
                {
                  keyframes: {
                    from: {
                      rx: 5,
                    },
                    to: {
                      rx: '20%',
                    },
                  },
                  title: 'Mixed',
                  description:
                    'Interpolation between absolute and relative values is **not supported** in SVG, thus the horizontal radius is changed **abruptly**',
                },
              ],
              title: 'Horizontal Radius (rx)',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      ry: 20,
                    },
                  },
                  title: 'Absolute',
                  description: 'Animates from default `ry=0` to `ry=20`',
                },
                {
                  keyframes: {
                    from: {
                      ry: '5%',
                    },
                    to: {
                      ry: '20%',
                    },
                  },
                  title: 'Percentage',
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                },
                {
                  keyframes: {
                    from: {
                      ry: 5,
                    },
                    to: {
                      ry: '20%',
                    },
                  },
                  title: 'Mixed',
                  description:
                    'Interpolation between absolute and relative values is **not supported** in SVG, thus the vertical radius is changed **abruptly**',
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
