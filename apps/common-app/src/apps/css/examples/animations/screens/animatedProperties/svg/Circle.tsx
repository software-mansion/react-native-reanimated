import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Circle, type CircleProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CircleExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CircleProps> },
      CircleProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} width={100}>
          <AnimatedCircle
            animatedProps={animation}
            cx={50}
            cy={50}
            fill={colors.primary}
            r={20}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Radius',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      r: 50,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      r: '10%',
                    },
                    to: {
                      r: '50%',
                    },
                  },
                  title: 'Percentage values (from 10% to 50%)',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      r: 10,
                    },
                    to: {
                      r: '50%',
                    },
                  },
                  title: 'Mixed values (from 10 to 50%)',
                },
              ],
              title: 'Circle Radius',
            },
          ],
        },
        {
          name: 'Position',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      cx: 0,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    '0 is the same as 0%, so the circle animation is smooth between 0 and 100%',
                  keyframes: {
                    from: {
                      cx: 0,
                    },
                    to: {
                      cx: '100%',
                    },
                  },
                  title: 'Relative value (from 0 to 100%)',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      cx: 50,
                    },
                    to: {
                      cx: '100%',
                    },
                  },
                  title: 'Mixed values (from 50 to 100%)',
                },
              ],
              title: 'Circle Center X',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      cy: 0,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    '0 is the same as 0%, so the circle animation is smooth between 0 and 100%',
                  keyframes: {
                    from: {
                      cy: 0,
                    },
                    to: {
                      cy: '100%',
                    },
                  },
                  title: 'Relative values (from 0 to 100%)',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      cy: 50,
                    },
                    to: {
                      cy: '100%',
                    },
                  },
                  title: 'Mixed values (from 50 to 100%)',
                },
              ],
              title: 'Circle Center Y',
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
