import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Defs, RadialGradient, Rect, Svg } from 'react-native-svg';

import { type CSSRadialGradientProps } from 'react-native-reanimated';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedGrad = Animated.createAnimatedComponent(RadialGradient);

const DefsWithChildren = Defs as React.ComponentType<{
  children?: React.ReactNode;
}>;

export default function StopExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CSSRadialGradientProps> },
      CSSRadialGradientProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation }) => (
        <Svg height={300} width={300}>
          <DefsWithChildren>
            <AnimatedGrad
              animatedProps={animation}
              gradientUnits="objectBoundingBox"
              id="radialGrad"
            />
          </DefsWithChildren>
          <Rect
            fill="url(#radialGrad)"
            height={100}
            width={100}
            x={100}
            y={100}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Colors and stops',
          sections: [
            {
              examples: [
                {
                  title: 'Pulsating orb',
                  description:
                    'Smoothly animates radius and shifts the center slightly (constant number of stops).',
                  keyframes: {
                    from: {
                      fx: '30%',
                      fy: '30%',
                      cx: '50%',
                      cy: '50%',
                      r: '30%',
                      gradient: [
                        { offset: '0%', color: '#ff0080', opacity: 1 },
                        { offset: '100%', color: '#4b0082', opacity: 0.2 },
                      ],
                    },
                    to: {
                      fx: '30%',
                      fy: '30%',
                      cx: '45%',
                      cy: '45%',
                      r: '60%',
                      gradient: [
                        { offset: '0%', color: '#00ffff', opacity: 1 },
                        { offset: '100%', color: '#0000ff', opacity: 0.8 },
                      ],
                    },
                  },
                },
                {
                  title: 'The Stop Shuffle',
                  description:
                    'Stops are in different orders and wildly different offsets.',
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '90%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '10%', color: 'blue', opacity: 1 },
                        { offset: '100%', color: 'red', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Changing colors',
            },
            {
              examples: [
                {
                  title: 'Night and day',
                  description:
                    'Transitioning from a simple 2-stop sun to a complex sunset (with more stops).',
                  keyframes: {
                    from: {
                      cx: '25%',
                      cy: '25%',
                      gradient: [
                        { offset: '0%', color: '#fdbb2d', opacity: 1 },
                        { offset: '100%', color: '#22c1c3', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '25%',
                      cy: '25%',
                      gradient: [
                        { offset: '0%', color: '#fdbb2d', opacity: 1 },
                        { offset: '30%', color: '#b21f1f', opacity: 1 },
                        { offset: '60%', color: '#1a2a6c', opacity: 1 },
                        { offset: '100%', color: '#000000', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Changing number of stops',
            },
            {
              examples: [
                {
                  title: 'Disappearing center',
                  description: 'Center of the gradient becomes transparent.',

                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: '#9b0808', opacity: 1 },
                        { offset: '100%', color: '#35e20a', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#9b0808', opacity: 0 },
                        { offset: '100%', color: '#35e20a', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Opacity',
            },
          ],
        },
        {
          name: 'Position',
          sections: [
            {
              examples: [
                {
                  title: 'Focal point bug',
                  description:
                    'Focal point has to remain in the gradient to avoid bugs like this',
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      r: '20%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '20%',
                      cy: '50%',
                      fx: '50%',
                      fy: '50%',
                      r: '20%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Focal point pos - decimal fraction',
                  description:
                    'You can interpolate between decimal fraction coords.',
                  keyframes: {
                    from: {
                      fx: 0.5,
                      fy: 0.5,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: 0.3,
                      fy: 0.3,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Focal point pos - percentage',
                  description: 'You can interpolate between percentage coords.',
                  keyframes: {
                    from: {
                      fx: '50%',
                      fy: '50%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: '30%',
                      fy: '30%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Focal point pos - mix',
                  description:
                    "You can't mix percentages and decimal fractions.",
                  keyframes: {
                    from: {
                      fx: '50%',
                      fy: '50%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: 0.3,
                      fy: 0.3,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Focal point',
            },
            {
              examples: [
                {
                  title: 'Gradient center pos - decimal fraction',
                  description:
                    'You can interpolate between decimal fraction coords.',
                  keyframes: {
                    from: {
                      cx: 0.5,
                      cy: 0.5,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: 0.3,
                      cy: 0.3,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Gradient center pos - percentage',
                  description: 'You can interpolate between percentage coords.',
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '30%',
                      cy: '30%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Gradient center pos - mix',
                  description:
                    "You can't mix percentages and decimal fractions.",
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: 0.3,
                      cy: 0.3,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Gradient position',
            },
            {
              examples: [
                {
                  title: 'Movement combination',
                  description:
                    'You can move gradient center and focal point independently.',
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '20%',
                      cy: '20%',
                      fx: '45%',
                      fy: '45%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Gradient and focal point position',
            },
          ],
        },
        {
          name: 'Units',
          sections: [
            {
              title: 'Coordinate Systems',
              examples: [
                {
                  title: 'Absolute user space',
                  description:
                    'Uses gradientUnits: "userSpaceOnUse". Coordinates are absolute pixels relative to the Svg canvas.',
                  keyframes: {
                    from: {
                      gradientUnits: 'userSpaceOnUse',
                      cx: 150,
                      cy: 150,
                      r: 20,
                      gradient: [
                        { offset: '0%', color: '#ff0080', opacity: 1 },
                        {
                          offset: '100%',
                          color: '#4b0082',
                          opacity: 1,
                        },
                      ],
                    },
                    to: {
                      gradientUnits: 'userSpaceOnUse',
                      cx: 150,
                      cy: 150,
                      r: 40,
                      gradient: [
                        { offset: '0%', color: '#00ffff', opacity: 1 },
                        { offset: '100%', color: '#0000ff', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Interpolating unit systems',
                  description:
                    'Interpolating between "objectBoundingBox" and "userSpaceOnUse" causes a "jump" as 0.5 of rect size suddenly becomes 0.5px.',
                  keyframes: {
                    from: {
                      gradientUnits: 'objectBoundingBox',
                      cx: 0.5,
                      cy: 0.5,
                      r: 0.5,
                      gradient: [
                        { offset: '0%', color: 'yellow', opacity: 1 },
                        { offset: '100%', color: 'red', opacity: 1 },
                      ],
                    },
                    to: {
                      gradientUnits: 'userSpaceOnUse',
                      cx: 150,
                      cy: 150,
                      r: 50,
                      gradient: [
                        { offset: '0%', color: 'yellow', opacity: 1 },
                        { offset: '100%', color: 'red', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      ]}
    />
  );
}
