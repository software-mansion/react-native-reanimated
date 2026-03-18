import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Line, type LineProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function LineExample() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes<LineProps> }, LineProps>
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} width={100}>
          <AnimatedLine
            animatedProps={animation}
            stroke={colors.primary}
            strokeWidth={3}
            x1={0}
            x2={100}
            y1={0}
            y2={100}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Start Point',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      x1: 30,
                    },
                  },
                  title: 'Start X (x1) - Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      x1: '10%',
                    },
                    to: {
                      x1: '70%',
                    },
                  },
                  title: 'Start X (x1) - Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      x1: 20,
                    },
                    to: {
                      x1: '70%',
                    },
                  },
                  title: 'Start X (x1) - Mixed',
                },
              ],
              title: 'Start X Position (x1)',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      y1: 25,
                    },
                  },
                  title: 'Start Y (y1) - Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      y1: '10%',
                    },
                    to: {
                      y1: '80%',
                    },
                  },
                  title: 'Start Y (y1) - Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      y1: 15,
                    },
                    to: {
                      y1: '80%',
                    },
                  },
                  title: 'Start Y (y1) - Mixed',
                },
              ],
              title: 'Start Y Position (y1)',
            },
          ],
        },
        {
          name: 'End Point',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      x2: 75,
                    },
                  },
                  title: 'End X (x2) - Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      x2: '90%',
                    },
                    to: {
                      x2: '30%',
                    },
                  },
                  title: 'End X (x2) - Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      x2: 80,
                    },
                    to: {
                      x2: '30%',
                    },
                  },
                  title: 'End X (x2) - Mixed',
                },
              ],
              title: 'End X Position (x2)',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      y2: 60,
                    },
                  },
                  title: 'End Y (y2) - Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      y2: '90%',
                    },
                    to: {
                      y2: '20%',
                    },
                  },
                  title: 'End Y (y2) - Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      y2: 85,
                    },
                    to: {
                      y2: '20%',
                    },
                  },
                  title: 'End Y (y2) - Mixed',
                },
              ],
              title: 'End Y Position (y2)',
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
