import Animated, {
  type CSSAnimationKeyframes,
  type CSSLinearGradientProps,
} from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedGrad = Animated.createAnimatedComponent(LinearGradient);

export default function LinearGradientExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CSSLinearGradientProps> },
      CSSLinearGradientProps
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
            id="linearGrad"
          />
          <Rect
            fill="url(#linearGrad)"
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
                  description:
                    'Transitions from a top-left/bottom-right flow to a top-right/bottom-left flow.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#ff00cc', offset: '0%' },
                        { color: '#3333ff', offset: '100%' },
                      ],
                      x1: '0%',
                      x2: '100%',
                      y1: '0%',
                      y2: '100%',
                    },
                    to: {
                      gradient: [
                        { color: '#ff00cc', offset: '0%' },
                        { color: '#3333ff', offset: '100%' },
                      ],
                      x1: '100%',
                      x2: '0%',
                      y1: '0%',
                      y2: '100%',
                    },
                  },
                  title: 'Diagonal Slide',
                },
                {
                  description:
                    'The gradient axis folds from a full diagonal into a centered quadrant, creating a rotating kaleidoscope effect.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#e40c54', offset: '0%' },
                        { color: '#3333ff', offset: '50%' },
                        { color: '#14c926', offset: '100%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#13c8d8', offset: '0%' },
                        { color: '#aad315', offset: '50%' },
                        { color: '#d1089f', offset: '100%' },
                      ],
                      x1: '50%',
                      x2: '0%',
                      y1: '50%',
                      y2: '100%',
                    },
                  },
                  title: 'Prismatic Pivot',
                },
                {
                  description:
                    'A vertical highlight that "scans" across the shape horizontally.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#333', offset: '0%' },
                        { color: '#fff', offset: '50%' },
                        { color: '#333', offset: '100%' },
                      ],
                      x1: '-50%',
                      x2: '0%',
                      y1: '0%',
                      y2: '0%',
                    },
                    to: {
                      gradient: [
                        { color: '#333', offset: '0%' },
                        { color: '#fff', offset: '50%' },
                        { color: '#333', offset: '100%' },
                      ],
                      x1: '100%',
                      x2: '150%',
                      y1: '0%',
                      y2: '0%',
                    },
                  },
                  title: 'Scanning Beam',
                },
                {
                  description:
                    'Uses identical offsets to create a sharp, moving water-line effect.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#12568d', offset: '0%' },
                        { color: '#2196f3', offset: '10%' },
                        { color: '#e0e0e0', offset: '10%' },
                        { color: '#e0e0e0', offset: '100%' },
                      ],
                      x2: '0%',
                      y1: '100%',
                      y2: '0%',
                    },
                    to: {
                      gradient: [
                        { color: '#12568d', offset: '0%' },
                        { color: '#2196f3', offset: '70%' },
                        { color: '#e0e0e0', offset: '70%' },
                        { color: '#e0e0e0', offset: '100%' },
                      ],
                      x2: '0%',
                      y1: '100%',
                      y2: '0%',
                    },
                  },
                  title: 'Liquid Rise',
                },
              ],
              title: 'Movement and colors',
            },
            {
              examples: [
                {
                  description:
                    'Adding detail and complexity mid-animation (by creating new stops).',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#f00', offset: '0%' },
                        { color: '#00f', offset: '100%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#f00', offset: '0%' },
                        { color: '#0f0', offset: '33%' },
                        { color: '#ff0', offset: '66%' },
                        { color: '#00f', offset: '100%' },
                      ],
                    },
                  },
                  title: 'Prism Expansion 1',
                },
                {
                  description:
                    'Adding detail and complexity mid-animation (by changing color).',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#f00', offset: '0%' },
                        { color: '#f00', offset: '33%' },
                        { color: '#00f', offset: '66%' },
                        { color: '#00f', offset: '100%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#f00', offset: '0%' },
                        { color: '#0f0', offset: '33%' },
                        { color: '#ff0', offset: '66%' },
                        { color: '#00f', offset: '100%' },
                      ],
                    },
                  },
                  title: 'Prism Expansion 2',
                },
                {
                  description:
                    'Morphing a complex warm sunset into a deep, simple midnight blue.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: '#ff5f6d', offset: '20%' },
                        { color: '#ffc371', offset: '40%' },
                        { color: '#1739bd', offset: '70%' },
                        { color: '#000000', offset: '100%' },
                      ],
                      x2: '0%',
                      y1: '0%',
                      y2: '100%',
                    },
                    to: {
                      gradient: [
                        { color: '#221a72', offset: '0%' },
                        { color: '#000000', offset: '100%' },
                      ],
                      x2: '0%',
                      y1: '0%',

                      y2: '100%',
                    },
                  },
                  title: 'Twilight over the ocean',
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
                        { color: '#f00', offset: '0%' },
                        { color: '#00f', offset: '50%' },
                        { color: '#0f0', offset: '100%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#f00', offset: '0%' },
                        { color: '#00f', offset: '50%', opacity: 0 },
                        { color: '#0f0', offset: '100%' },
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
                        { color: '#f00', offset: '0%' },
                        { color: '#00f', offset: '50%' },
                        { color: '#0f0', offset: '100%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#f00', offset: '0%' },
                        { color: '#00f0', offset: '50%' },
                        { color: '#0f0', offset: '100%' },
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
                  description:
                    'Interpolating the origin point using 0-1 range decimal fractions.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: 0.5,
                      x2: 1,
                      y1: 0.5,
                      y2: 1,
                    },
                    to: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: 0,
                      x2: 1,
                      y1: 0,
                      y2: 1,
                    },
                  },
                  title: 'Start pos - decimal fraction',
                },
                {
                  description:
                    'Interpolating the origin point using percentage strings.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: '50%',
                      x2: '100%',
                      y1: '50%',
                      y2: '100%',
                    },
                    to: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: '0%',
                      x2: '100%',
                      y1: '0%',
                      y2: '100%',
                    },
                  },
                  title: 'Start pos - percentage',
                },
                {
                  description:
                    'Mixing decimal fractions and percentages across start/end points.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: 0.5,
                      x2: '100%',
                      y1: '0%',
                      y2: 1,
                    },
                    to: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: '0%',
                      x2: 0.5,
                      y1: 0.5,
                      y2: '50%',
                    },
                  },
                  title: 'Mixed units',
                },
              ],
              title: 'Start Point (x1, y1)',
            },
            {
              examples: [
                {
                  description:
                    'Moving the destination point while keeping the origin fixed.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: '0%',
                      x2: '100%',
                      y1: '0%',
                      y2: '0%',
                    },
                    to: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'green', offset: '50%' },
                        { color: 'blue', offset: '100%' },
                      ],
                      x1: '0%',
                      x2: '50%',
                      y1: '0%',
                      y2: '100%',
                    },
                  },
                  title: 'End point sweep',
                },
              ],
              title: 'End Point (x2, y2)',
            },
            {
              examples: [
                {
                  description:
                    'Moving both start and end points simultaneously to shift the gradient "beam".',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'black', offset: '0%' },
                        { color: 'white', offset: '50%' },
                        { color: 'black', offset: '100%' },
                      ],
                      x1: '0%',
                      x2: '20%',
                      y1: '0%',
                      y2: '0%',
                    },
                    to: {
                      gradient: [
                        { color: 'black', offset: '0%' },
                        { color: 'white', offset: '50%' },
                        { color: 'black', offset: '100%' },
                      ],
                      x1: '80%',
                      x2: '100%',
                      y1: '0%',
                      y2: '0%',
                    },
                  },
                  title: 'Parallel Slide',
                },
              ],
              title: 'Combined Vector Motion',
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
                      gradient: [
                        { color: '#0000ff', offset: '0%' },
                        {
                          color: '#ff0000',
                          offset: '100%',
                          opacity: 1,
                        },
                      ],
                      gradientUnits: 'userSpaceOnUse',
                      x1: 0,
                      x2: 300,
                      y1: 300,
                      y2: 0,
                    },
                    to: {
                      gradient: [
                        { color: '#0000ff', offset: '0%' },
                        {
                          color: '#ff0000',
                          offset: '100%',
                          opacity: 1,
                        },
                      ],
                      gradientUnits: 'userSpaceOnUse',
                      x1: 0,
                      x2: 300,
                      y1: 0,
                      y2: 300,
                    },
                  },
                  title: 'Absolute user space',
                },
                {
                  description:
                    'Interpolating between "objectBoundingBox" and "userSpaceOnUse" causes a "jump" as 0.5 of rect size suddenly becomes 0.5px.',
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'yellow', offset: '0%' },
                        { color: 'red', offset: '100%' },
                      ],
                      gradientUnits: 'objectBoundingBox',
                      x1: 0,
                      x2: 1,
                      y1: 0.5,
                      y2: 0.5,
                    },
                    to: {
                      gradient: [
                        { color: 'yellow', offset: '0%' },
                        { color: 'red', offset: '100%' },
                      ],
                      gradientUnits: 'userSpaceOnUse',
                      x1: 0,
                      x2: 1,
                      y1: 0.5,
                      y2: 0.5,
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
                id="linearGrad2">
                <Stop offset="0%" stopColor="red" stopOpacity="1" />
                <Stop offset="50%" stopColor="yellow" stopOpacity="1" />
              </AnimatedGrad>
              <Rect
                fill="url(#linearGrad2)"
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
                  description: `If no animation between stops is needed, the stops can be provided as children of the animated LinearGradient. `,
                  keyframes: {
                    from: {
                      x1: 0,
                      x2: 1,
                      y1: 0,
                      y2: 1,
                    },
                    to: {
                      x1: 1,
                      x2: 0,
                      y1: 0,
                      y2: 1,
                    },
                  },
                  title: 'Children stops',
                },
                {
                  description: `If there is an animation between stops needed, the stops have to be provided through the gradient prop.`,
                  keyframes: {
                    from: {
                      gradient: [
                        { color: 'red', offset: '0%' },
                        { color: 'yellow', offset: '50%' },
                      ],
                    },
                    to: {
                      gradient: [
                        { color: '#00ffff', offset: '0%' },
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
                        { color: '#00ffff', offset: '0%' },
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
