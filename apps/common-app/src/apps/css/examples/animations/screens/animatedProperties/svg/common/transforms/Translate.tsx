import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import { Rect, type RectProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function TranslateExample() {
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
          {/* <AnimatedRect
            animatedProps={animation}
            fill={colors.primary}
            height={40}
            width={40}
            x={30}
            y={30}
          /> */}
        </Svg>
      )}
      tabs={[
        {
          name: 'Transform Array',
          sections: [
            {
              description:
                'Translating an SVG element along the x-axis using absolute values.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateX: 0 }],
                    },
                    to: {
                      transform: [{ translateX: 50 }],
                    },
                  },
                  title: 'translateX from 0 to 50',
                },
              ],
              title: 'X translation',
            },
            {
              description:
                'Translating an SVG element along the y-axis using absolute values.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateY: 0 }],
                    },
                    to: {
                      transform: [{ translateY: 50 }],
                    },
                  },
                  title: 'translateY from 0 to 50',
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateX: 0 }, { translateY: 0 }],
                    },
                    to: {
                      transform: [{ translateX: 50 }, { translateY: 50 }],
                    },
                  },
                  title: 'translateX and translateY from 0 to 50',
                },
              ],
              title: 'XY translation',
            },
          ],
        },
        {
          name: 'Transform String',
          sections: [
            {
              description:
                'Translating an SVG element using transform string format.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: 'translateX(0px)',
                    },
                    to: {
                      transform: 'translateX(50px)',
                    },
                  },
                  title: 'translateX from 0px to 50px',
                },
              ],
              title: 'X translation',
            },
            {
              description:
                'Translating an SVG element using transform string format.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: 'translateY(0px)',
                    },
                    to: {
                      transform: 'translateY(50px)',
                    },
                  },
                  title: 'translateY from 0px to 50px',
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined using transform string.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: 'translateX(0px) translateY(0px)',
                    },
                    to: {
                      transform: 'translateX(50px) translateY(50px)',
                    },
                  },
                  title: 'translateX and translateY from 0px to 50px',
                },
              ],
              title: 'XY translation',
            },
          ],
        },
        {
          name: 'Relative',
          sections: [
            {
              description:
                'Translating an SVG element along the x-axis. The value is **relative to** the element `width`.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateX: '0%' }],
                    },
                    to: {
                      transform: [{ translateX: '100%' }],
                    },
                  },
                  title: 'translateX from 0% to 100%',
                },
              ],
              title: 'X translation',
            },
            {
              description:
                'Translating an SVG element along the y-axis. The value is **relative to** the element `height`.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateY: '0%' }],
                    },
                    to: {
                      transform: [{ translateY: '100%' }],
                    },
                  },
                  title: 'translateY from 0% to 100%',
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateX: '0%' }, { translateY: '0%' }],
                    },
                    to: {
                      transform: [
                        { translateX: '100%' },
                        { translateY: '100%' },
                      ],
                    },
                  },
                  title: 'translateX and translateY from 0% to 100%',
                },
              ],
              title: 'XY translation',
            },
          ],
        },
        {
          name: 'Mixed',
          sections: [
            {
              description:
                'Translating between pixels and percentages. The percentage value is **relative to** the element `width`.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateX: 25 }],
                    },
                    to: {
                      transform: [{ translateX: '-100%' }],
                    },
                  },
                  title: 'translateX from 25 to -100%',
                },
              ],
              title: 'X translation',
            },
            {
              description:
                'Translating between pixels and percentages. The percentage value is **relative to** the element `height`.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateY: 25 }],
                    },
                    to: {
                      transform: [{ translateY: '-100%' }],
                    },
                  },
                  title: 'translateY from 25 to -100%',
                },
              ],
              title: 'Y translation',
            },
            {
              description: 'Both translations combined.',
              examples: [
                {
                  keyframes: {
                    from: {
                      transform: [{ translateX: '-100%' }, { translateY: 25 }],
                    },
                    to: {
                      transform: [{ translateX: 25 }, { translateY: '-100%' }],
                    },
                  },
                  title: 'translateX and translateY',
                },
              ],
              title: 'XY translation',
            },
          ],
        },
      ]}
    />
  );
}
