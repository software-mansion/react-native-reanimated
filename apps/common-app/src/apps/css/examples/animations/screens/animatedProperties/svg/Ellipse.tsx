import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Ellipse, type EllipseProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export default function EllipseExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<EllipseProps> },
      EllipseProps
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
          <AnimatedEllipse
            animatedProps={animation}
            cx={50}
            cy={50}
            fill={colors.primary}
            rx={20}
            ry={15}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Radii',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      rx: 40,
                      ry: 30,
                    },
                  },
                  title: 'Absolute values',
                },
                {
                  description:
                    'Smoothly interpolates between absolute and percentage values by resolving them to the same unit',
                  keyframes: {
                    from: {
                      rx: 10,
                      ry: 8,
                    },
                    to: {
                      rx: '40%',
                      ry: '30%',
                    },
                  },
                  title: 'Relative values (from absolute to percentage)',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      rx: '10%',
                      ry: '8%',
                    },
                    to: {
                      rx: '40%',
                      ry: '30%',
                    },
                  },
                  title: 'Percentage values (from 10%/8% to 40%/30%)',
                },
              ],
              title: 'Ellipse Radii',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      rx: 50,
                    },
                  },
                  title: 'Horizontal Radius (rx) - Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      rx: '10%',
                    },
                    to: {
                      rx: '50%',
                    },
                  },
                  title: 'Horizontal Radius (rx) - Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      rx: 10,
                    },
                    to: {
                      rx: '50%',
                    },
                  },
                  title: 'Horizontal Radius (rx) - Mixed',
                },
              ],
              title: 'Horizontal Radius (rx)',
            },
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      ry: 50,
                    },
                  },
                  title: 'Vertical Radius (ry) - Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative scaling',
                  keyframes: {
                    from: {
                      ry: '10%',
                    },
                    to: {
                      ry: '50%',
                    },
                  },
                  title: 'Vertical Radius (ry) - Percentage',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      ry: 10,
                    },
                    to: {
                      ry: '50%',
                    },
                  },
                  title: 'Vertical Radius (ry) - Mixed',
                },
              ],
              title: 'Vertical Radius (ry)',
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
                    '0 is the same as 0%, so the ellipse animation is smooth between 0 and 100%',
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
              title: 'Ellipse Center X',
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
                    '0 is the same as 0%, so the ellipse animation is smooth between 0 and 100%',
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
              title: 'Ellipse Center Y',
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
