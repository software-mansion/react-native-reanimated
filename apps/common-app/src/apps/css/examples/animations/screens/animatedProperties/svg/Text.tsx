import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Svg, Text, type TextProps } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function TextExample() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes<TextProps> }, TextProps>
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={60} width={200}>
          <AnimatedText
            animatedProps={animation}
            fill={colors.primary}
            fontSize={20}
            x={30}
            y={40}>
            Hello SVG
          </AnimatedText>
        </Svg>
      )}
      tabs={[
        {
          name: 'Position',
          sections: [
            {
              examples: [
                {
                  description:
                    'Animates x position from 30 to 150 using absolute values',
                  keyframes: {
                    from: {
                      x: 30,
                    },
                    to: {
                      x: 150,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animates x position from 30 to 150 using absolute values',
                  keyframes: {
                    from: {
                      x: 30,
                    },
                    to: {
                      x: [30, 100],
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      x: '5%',
                    },
                    to: {
                      x: '75%',
                    },
                  },
                  title: 'Percentage values (from 5% to 75%)',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      x: 30,
                    },
                    to: {
                      x: '75%',
                    },
                  },
                  title: 'Mixed values (from 30 to 75%)',
                },
              ],
              title: 'X Position',
            },
            {
              examples: [
                {
                  description:
                    'Animates y position from 40 to 15 using absolute values',
                  keyframes: {
                    from: {
                      y: 40,
                    },
                    to: {
                      y: 15,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      y: '30%',
                    },
                    to: {
                      y: '80%',
                    },
                  },
                  title: 'Percentage values (from 30% to 80%)',
                },
                {
                  description:
                    'Smoothly interpolates between an absolute and a percentage value by resolving them to the same unit',
                  keyframes: {
                    from: {
                      y: 20,
                    },
                    to: {
                      y: '80%',
                    },
                  },
                  title: 'Mixed values (from 20 to 80%)',
                },
              ],
              title: 'Y Position',
            },
            {
              examples: [
                {
                  description:
                    'Shifts the whole text horizontally by animating a single dx offset',
                  keyframes: {
                    to: {
                      dx: 30,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animates per-glyph horizontal offsets to spread the letters apart',
                  keyframes: {
                    to: {
                      dx: [0, 3, 6, 9, 12, 9, 6, 3, 0],
                    },
                  },
                  title: 'Per-glyph spread',
                },
                {
                  description:
                    'Animates per-glyph horizontal offsets to spread the letters apart',
                  keyframes: {
                    to: {
                      dx: [0, 100],
                    },
                  },
                  title: 'Per-glyph spread',
                },
              ],
              title: 'DX (Horizontal Offset)',
            },
            {
              examples: [
                {
                  description:
                    'Shifts the whole text vertically by animating a single dy offset',
                  keyframes: {
                    to: {
                      dy: 15,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animates per-glyph vertical offsets to create a wave effect',
                  keyframes: {
                    to: {
                      dy: [0, -8, -12, -8, 0, 8, 12, 8, 0],
                    },
                  },
                  title: 'Per-glyph wave',
                },
              ],
              title: 'DY (Vertical Offset)',
            },
          ],
        },
        {
          name: 'Rotation',
          sections: [
            {
              examples: [
                {
                  description: 'Rotates the entire text from 0° to 30°',
                  keyframes: {
                    to: {
                      rotate: 30,
                    },
                  },
                  title: 'Absolute value',
                },
                {
                  description:
                    'Animates per-glyph rotation to create a cascading tilt effect',
                  keyframes: {
                    to: {
                      rotate: [0, 5, 10, 20, 30, 20, 10, 5, 0],
                    },
                  },
                  title: 'Per-glyph cascade',
                },
              ],
              title: 'Rotation',
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
            {
              examples: [
                {
                  keyframes: {
                    to: {
                      fill: 'red',
                    },
                  },
                  title: 'Fill color',
                },
                {
                  keyframes: {
                    to: {
                      fillOpacity: 0.2,
                    },
                  },
                  title: 'Fill opacity',
                },
              ],
              title: 'Fill',
            },
          ],
        },
      ]}
    />
  );
}
