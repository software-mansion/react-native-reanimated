import Animated, {
  type CSSAnimationKeyframes,
  type CSSRadialGradientProps,
} from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { RadialGradient, Rect, Stop, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedGrad = Animated.createAnimatedComponent(RadialGradient);

// TODO:
// Remove when RNSVG fixes 'Unable to apply focus point of RadialGradient on Android' problem.
const FOCAL_POINT_DISCLAIMER =
  '(Note: fx/fy animations currently work only on iOS due to RNSVG Android limitations)';

export default function RadialGradientExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CSSRadialGradientProps> },
      CSSRadialGradientProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation }) => (
        <Svg height={300} width={300}>
          <AnimatedGrad
            animatedProps={animation}
            gradientUnits="objectBoundingBox"
            id="radialGrad"
          />
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
                  description: `Smoothly animates radius and shifts the center slightly.\n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      fx: '30%',
                      fy: '30%',
                      gradient: [
                        { color: '#ff0080', offset: '0%', opacity: 1 },
                        { color: '#4b0082', offset: '100%', opacity: 0.2 },
                      ],
                      r: '30%',
                    },
                    to: {
                      cx: '45%',
                      cy: '45%',
                      fx: '30%',
                      fy: '30%',
                      gradient: [
                        { color: '#00ffff', offset: '0%', opacity: 1 },
                        { color: '#0000ff', offset: '100%', opacity: 0.8 },
                      ],
                      r: '60%',
                    },
                  },
                  title: 'Pulsating orb',
                },
                {
                  description:
                    'Stops are in different orders and wildly different offsets.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'blue', offset: '90%', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: 'blue', offset: '10%', opacity: 1 },
                        { color: 'red', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'The Stop Shuffle',
                },
              ],
              title: 'Changing colors',
            },
            {
              examples: [
                {
                  description:
                    'Transitioning from a simple 2-stop sun to a complex sunset (with more stops).',
                  keyframes: {
                    from: {
                      cx: '25%',
                      cy: '25%',
                      gradient: [
                        { color: '#fdbb2d', offset: '0%', opacity: 1 },
                        { color: '#22c1c3', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '25%',
                      cy: '25%',
                      gradient: [
                        { color: '#fdbb2d', offset: '0%', opacity: 1 },
                        { color: '#b21f1f', offset: '30%', opacity: 1 },
                        { color: '#1a2a6c', offset: '60%', opacity: 1 },
                        { color: '#000000', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Night and day',
                },
              ],
              title: 'Changing number of stops',
            },
            {
              examples: [
                {
                  description: 'Center of the gradient becomes transparent.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#9b0808', offset: '0%', opacity: 1 },
                        { color: '#35e20a', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#9b0808', offset: '0%', opacity: 0 },
                        { color: '#35e20a', offset: '100%', opacity: 1 },
                      ],
                    },
                  },

                  title: 'Disappearing center',
                },
                {
                  description:
                    "Stop's opacity is multiplied by color's opacity.",
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#9b0808', offset: '0%', opacity: 1 },
                        { color: '#35e20a', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#9b080800', offset: '0%', opacity: 1 },
                        { color: '#35e20a', offset: '100%', opacity: 1 },
                      ],
                    },
                  },

                  title: 'Opacity calculation',
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
                  description: `Focal point has to remain in the gradient to avoid bugs like this.\n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                      r: '20%',
                    },
                    to: {
                      cx: '20%',
                      cy: '50%',
                      fx: '50%',
                      fy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                      r: '20%',
                    },
                  },
                  title: 'Focal point bug',
                },
                {
                  description: `You can interpolate between decimal fraction coords.\n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      fx: 0.5,
                      fy: 0.5,
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: 0.3,
                      fy: 0.3,
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Focal point pos - decimal fraction',
                },
                {
                  description: `You can interpolate between percentage coords.\n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      fx: '50%',
                      fy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: '30%',
                      fy: '30%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Focal point pos - percentage',
                },
                {
                  description: `You can't mix percentages and decimal fractions.\n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      fx: '50%',
                      fy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: 0.3,
                      fy: 0.3,
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Focal point pos - mix',
                },
              ],
              title: 'Focal point',
            },
            {
              examples: [
                {
                  description:
                    'You can interpolate between decimal fraction coords.',
                  keyframes: {
                    from: {
                      cx: 0.5,
                      cy: 0.5,
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: 0.3,
                      cy: 0.3,
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Gradient center pos - decimal fraction',
                },
                {
                  description: 'You can interpolate between percentage coords.',
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '30%',
                      cy: '30%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Gradient center pos - percentage',
                },
                {
                  description:
                    "You can't mix percentages and decimal fractions.",
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: 0.3,
                      cy: 0.3,
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Gradient center pos - mix',
                },
              ],
              title: 'Gradient position',
            },
            {
              examples: [
                {
                  description: `You can move gradient center and focal point independently.\n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '20%',
                      cy: '20%',
                      fx: '45%',
                      fy: '45%',
                      gradient: [
                        { color: 'red', offset: '0%', opacity: 1 },
                        { color: 'green', offset: '50%', opacity: 1 },
                        { color: 'blue', offset: '100%', opacity: 1 },
                      ],
                    },
                  },
                  title: 'Movement combination',
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
              examples: [
                {
                  description:
                    'Uses gradientUnits: "userSpaceOnUse". Coordinates are absolute pixels relative to the Svg canvas.',
                  keyframes: {
                    from: {
                      cx: 150,
                      cy: 150,
                      gradient: [
                        { color: '#ff0080', offset: '0%', opacity: 1 },
                        {
                          color: '#4b0082',
                          offset: '100%',
                          opacity: 1,
                        },
                      ],
                      gradientUnits: 'userSpaceOnUse',
                      r: 20,
                    },
                    to: {
                      cx: 150,
                      cy: 150,
                      gradient: [
                        { color: '#00ffff', offset: '0%', opacity: 1 },
                        { color: '#0000ff', offset: '100%', opacity: 1 },
                      ],
                      gradientUnits: 'userSpaceOnUse',
                      r: 40,
                    },
                  },
                  title: 'Absolute user space',
                },
                {
                  description:
                    'Interpolating between "objectBoundingBox" and "userSpaceOnUse" causes a "jump" as 0.5 of rect size suddenly becomes 0.5px.',
                  keyframes: {
                    from: {
                      cx: 0.5,
                      cy: 0.5,
                      gradient: [
                        { color: 'yellow', offset: '0%', opacity: 1 },
                        { color: 'red', offset: '100%', opacity: 1 },
                      ],
                      gradientUnits: 'objectBoundingBox',
                      r: 0.5,
                    },
                    to: {
                      cx: 150,
                      cy: 150,
                      gradient: [
                        { color: 'yellow', offset: '0%', opacity: 1 },
                        { color: 'red', offset: '100%', opacity: 1 },
                      ],
                      gradientUnits: 'userSpaceOnUse',
                      r: 50,
                    },
                  },
                  title: 'Interpolating unit systems',
                },
              ],
              title: 'Coordinate Systems',
            },
          ],
        },
        {
          name: 'Stops as children and props',
          renderExample: ({ animation }) => (
            <Svg height={300} width={300}>
              <AnimatedGrad
                animatedProps={animation}
                gradientUnits="objectBoundingBox"
                id="radialGrad2">
                <Stop offset="0%" stopColor="red" stopOpacity="1" />
                <Stop offset="50%" stopColor="yellow" stopOpacity="1" />
              </AnimatedGrad>
              <Rect
                fill="url(#radialGrad2)"
                height={100}
                width={100}
                x={100}
                y={100}
              />
            </Svg>
          ),
          sections: [
            {
              examples: [
                {
                  description: `If no animation between stops is needed, the stops can be provided as children of the animated RadialGradient. \n\n${FOCAL_POINT_DISCLAIMER}`,
                  keyframes: {
                    from: {
                      cx: '50%',
                      cy: '50%',
                      fx: '30%',
                      fy: '30%',
                      r: '30%',
                    },
                    to: {
                      cx: '45%',
                      cy: '45%',
                      fx: '30%',
                      fy: '30%',
                      r: '60%',
                    },
                  },
                  title: 'Children stops',
                },
                {
                  description: `If there is an animation between stops needed, the stops have to be provided as the gradient prop.`,
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'yellow', offset: '50%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#00ffff', offset: '0%', opacity: 1 },
                        { color: '#0000ff', offset: '100%', opacity: 0.8 },
                      ],
                    },
                  },
                  title: 'Prop stops',
                },
                {
                  description: `You cannot mix children stops and prop stops. It will result in prop stops being prioritized.`,
                  keyframes: {
                    to: {
                      gradient: [
                        { color: '#00ffff', offset: '0%', opacity: 1 },
                        { color: '#0000ff', offset: '100%', opacity: 0.8 },
                      ],
                    },
                  },
                  title: 'Mixed stops',
                },
              ],
              title: 'Stops as props or as children',
            },
          ],
        },
      ]}
    />
  );
}
