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
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
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
                  title: 'Diagonal Slide',
                  description:
                    'Transitions from a top-left/bottom-right flow to a top-right/bottom-left flow.',
                  keyframes: {
                    from: {
                      x1: '0%',
                      y1: '0%',
                      x2: '100%',
                      y2: '100%',
                      gradient: [
                        { offset: '0%', color: '#ff00cc', opacity: 1 },
                        { offset: '100%', color: '#3333ff', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: '100%',
                      y1: '0%',
                      x2: '0%',
                      y2: '100%',
                      gradient: [
                        { offset: '0%', color: '#ff00cc', opacity: 1 },
                        { offset: '100%', color: '#3333ff', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Prismatic Pivot',
                  description:
                    'The gradient axis folds from a full diagonal into a centered quadrant, creating a rotating kaleidoscope effect.',
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: '#e40c54', opacity: 1 },
                        { offset: '50%', color: '#3333ff', opacity: 1 },
                        { offset: '100%', color: '#14c926', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: '50%',
                      y1: '50%',
                      x2: '0%',
                      y2: '100%',
                      gradient: [
                        { offset: '0%', color: '#13c8d8', opacity: 1 },
                        { offset: '50%', color: '#aad315', opacity: 1 },
                        { offset: '100%', color: '#d1089f', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Scanning Beam',
                  description:
                    'A vertical highlight that "scans" across the shape horizontally.',
                  keyframes: {
                    from: {
                      x1: '-50%',
                      x2: '0%',
                      y1: '0%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: '#333', opacity: 1 },
                        { offset: '50%', color: '#fff', opacity: 1 },
                        { offset: '100%', color: '#333', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: '100%',
                      x2: '150%',
                      y1: '0%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: '#333', opacity: 1 },
                        { offset: '50%', color: '#fff', opacity: 1 },
                        { offset: '100%', color: '#333', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Liquid Rise',
                  description:
                    'Uses identical offsets to create a sharp, moving water-line effect.',
                  keyframes: {
                    from: {
                      y1: '100%',
                      x2: '0%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: '#12568d', opacity: 1 },
                        { offset: '10%', color: '#2196f3', opacity: 1 },
                        { offset: '10%', color: '#e0e0e0', opacity: 1 },
                        { offset: '100%', color: '#e0e0e0', opacity: 1 },
                      ],
                    },
                    to: {
                      y1: '100%',
                      x2: '0%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: '#12568d', opacity: 1 },
                        { offset: '70%', color: '#2196f3', opacity: 1 },
                        { offset: '70%', color: '#e0e0e0', opacity: 1 },
                        { offset: '100%', color: '#e0e0e0', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
              title: 'Movement and colors',
            },
            {
              examples: [
                {
                  title: 'Prism Expansion 1',
                  description:
                    'Adding detail and complexity mid-animation (by creating new stops).',
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '100%', color: '#00f', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '33%', color: '#0f0', opacity: 1 },
                        { offset: '66%', color: '#ff0', opacity: 1 },
                        { offset: '100%', color: '#00f', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Prism Expansion 2',
                  description:
                    'Adding detail and complexity mid-animation (by changing color).',
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '33%', color: '#f00', opacity: 1 },
                        { offset: '66%', color: '#00f', opacity: 1 },
                        { offset: '100%', color: '#00f', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '33%', color: '#0f0', opacity: 1 },
                        { offset: '66%', color: '#ff0', opacity: 1 },
                        { offset: '100%', color: '#00f', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Twilight over the ocean',
                  description:
                    'Morphing a complex warm sunset into a deep, simple midnight blue.',
                  keyframes: {
                    from: {
                      y1: '0%',
                      x2: '0%',
                      y2: '100%',
                      gradient: [
                        { offset: '20%', color: '#ff5f6d', opacity: 1 },
                        { offset: '40%', color: '#ffc371', opacity: 1 },
                        { offset: '70%', color: '#1739bd', opacity: 1 },
                        { offset: '100%', color: '#000000', opacity: 1 },
                      ],
                    },
                    to: {
                      y1: '0%',
                      x2: '0%',
                      y2: '100%',

                      gradient: [
                        { offset: '0%', color: '#221a72', opacity: 1 },
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
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '50%', color: '#00f', opacity: 1 },
                        { offset: '100%', color: '#0f0', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '50%', color: '#00f', opacity: 0 },
                        { offset: '100%', color: '#0f0', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Opacity calculation',
                  description:
                    "Stop's opacity is multiplied by color's opacity.",
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '50%', color: '#00f', opacity: 1 },
                        { offset: '100%', color: '#0f0', opacity: 1 },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#f00', opacity: 1 },
                        { offset: '50%', color: '#00f0', opacity: 1 },
                        { offset: '100%', color: '#0f0', opacity: 1 },
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
              title: 'Start Point (x1, y1)',
              examples: [
                {
                  title: 'Start pos - decimal fraction',
                  description:
                    'Interpolating the origin point using 0-1 range decimal fractions.',
                  keyframes: {
                    from: {
                      x1: 0.5,
                      y1: 0.5,
                      x2: 1,
                      y2: 1,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: 0,
                      y1: 0,
                      x2: 1,
                      y2: 1,
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Start pos - percentage',
                  description:
                    'Interpolating the origin point using percentage strings.',
                  keyframes: {
                    from: {
                      x1: '50%',
                      y1: '50%',
                      x2: '100%',
                      y2: '100%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: '0%',
                      y1: '0%',
                      x2: '100%',
                      y2: '100%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
            },
            {
              title: 'End Point (x2, y2)',
              examples: [
                {
                  title: 'End point sweep',
                  description:
                    'Moving the destination point while keeping the origin fixed.',
                  keyframes: {
                    from: {
                      x1: '0%',
                      y1: '0%',
                      x2: '100%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: '0%',
                      y1: '0%',
                      x2: '50%',
                      y2: '100%',
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '50%', color: 'green', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
            },
            {
              title: 'Combined Vector Motion',
              examples: [
                {
                  title: 'Parallel Slide',
                  description:
                    'Moving both start and end points simultaneously to shift the gradient "beam".',
                  keyframes: {
                    from: {
                      x1: '0%',
                      x2: '20%',
                      y1: '0%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: 'black', opacity: 1 },
                        { offset: '50%', color: 'white', opacity: 1 },
                        { offset: '100%', color: 'black', opacity: 1 },
                      ],
                    },
                    to: {
                      x1: '80%',
                      x2: '100%',
                      y1: '0%',
                      y2: '0%',
                      gradient: [
                        { offset: '0%', color: 'black', opacity: 1 },
                        { offset: '50%', color: 'white', opacity: 1 },
                        { offset: '100%', color: 'black', opacity: 1 },
                      ],
                    },
                  },
                },
              ],
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
                      x1: 0,
                      y1: 300,
                      x2: 300,
                      y2: 0,
                      gradient: [
                        { offset: '0%', color: '#0000ff', opacity: 1 },
                        {
                          offset: '100%',
                          color: '#ff0000',
                          opacity: 1,
                        },
                      ],
                    },
                    to: {
                      gradientUnits: 'userSpaceOnUse',
                      x1: 0,
                      y1: 0,
                      x2: 300,
                      y2: 300,
                      gradient: [
                        { offset: '0%', color: '#0000ff', opacity: 1 },
                        {
                          offset: '100%',
                          color: '#ff0000',
                          opacity: 1,
                        },
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
                      x1: 0,
                      y1: 0.5,
                      x2: 1,
                      y2: 0.5,
                      gradient: [
                        { offset: '0%', color: 'yellow', opacity: 1 },
                        { offset: '100%', color: 'red', opacity: 1 },
                      ],
                    },
                    to: {
                      gradientUnits: 'userSpaceOnUse',
                      x1: 0,
                      y1: 0.5,
                      x2: 1,
                      y2: 0.5,
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
                  title: 'Children stops',
                  description: `If no animation between stops is needed, the stops can be provided as children of the animated LinearGradient. `,
                  keyframes: {
                    from: {
                      x1: 0,
                      y1: 0,
                      x2: 1,
                      y2: 1,
                    },
                    to: {
                      x1: 1,
                      y1: 0,
                      x2: 0,
                      y2: 1,
                    },
                  },
                },
                {
                  title: 'Prop stops',
                  description: `If there is an animation between stops needed, the stops have to be provided through the gradient prop.`,
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: 'red' },
                        { offset: '50%', color: 'yellow' },
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#00ffff', opacity: 1 },
                        { offset: '100%', color: '#0000ff', opacity: 0.8 },
                      ],
                    },
                  },
                },
                {
                  title: 'Mixed stops',
                  description: `You cannot mix children stops and prop stops. It will result in prop stops being prioritized.`,
                  keyframes: {
                    to: {
                      gradient: [
                        { offset: '0%', color: '#00ffff', opacity: 1 },
                        { offset: '100%', color: '#0000ff', opacity: 0.8 },
                      ],
                    },
                  },
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
