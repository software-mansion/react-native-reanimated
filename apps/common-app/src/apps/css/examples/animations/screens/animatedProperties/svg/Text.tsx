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
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<TextProps> },
      TextProps
    >
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
            x={[30]}
            dx={[4, 10, 20]}
            rotate={[20, 10]}
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
                  description: 'Animates from default `x=10` to `x=100`',
                  keyframes: {
                    to: {
                      x: 100,
                    },
                  },
                  title: 'Absolute',
                },
                {
                  description:
                    'Animation using only percentage values for smooth relative positioning',
                  keyframes: {
                    from: {
                      x: '5%',
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
                      x: 10,
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
                  description: 'Animates from default `y=40` to `y=20`',
                  keyframes: {
                    to: {
                      y: 20,
                    },
                  },
                  title: 'Absolute',
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
                      y: '80%',
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
