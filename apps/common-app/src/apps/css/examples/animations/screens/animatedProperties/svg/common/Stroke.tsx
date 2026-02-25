import type { JSX } from 'react';
import type {
  CSSAnimationKeyframes,
  CSSAnimationProperties,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import type { StrokeProps } from 'react-native-svg';
import { Circle, Path, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function StrokeExample() {
  return (
    <ExamplesScreen<
      {
        keyframes: CSSAnimationKeyframes<StrokeProps>;
        animationProps?: Omit<CSSAnimationProperties, 'animationName'>;
        props?: StrokeProps;
        render?: (
          props: StrokeProps & {
            animatedProps: CSSAnimationProperties<StrokeProps>;
          }
        ) => JSX.Element;
      },
      StrokeProps
    >
      buildAnimation={({ animationProps, keyframes }) => ({
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
        ...animationProps,
      })}
      renderExample={({ animation, props, render }) =>
        render?.({ ...props, animatedProps: animation }) ?? (
          <Svg height={100} viewBox="0 0 100 100" width={100}>
            <AnimatedCircle
              animatedProps={animation}
              cx={50}
              cy={50}
              fill={colors.primary}
              r={20}
              stroke={colors.primaryDark}
              {...props}
            />
          </Svg>
        )
      }
      sections={[
        {
          examples: [
            {
              description: '`strokeWidth` is set to `10`',
              keyframes: {
                from: {
                  stroke: 'blue',
                },
                to: {
                  stroke: 'red',
                },
              },
              props: {
                strokeWidth: 10,
              },
              title: 'Changing stroke (color)',
            },
          ],
          title: 'Stroke',
        },
        {
          examples: [
            {
              keyframes: {
                to: {
                  strokeWidth: 20,
                },
              },
              title: 'Absolute value',
            },
            {
              description:
                'The default `strokeWidth` is 1 and it is not smoothly animated to `20%`. To get a smooth animation, we need to specify a % value in all keyframes',
              keyframes: {
                from: {
                  strokeWidth: '10%',
                },
                to: {
                  strokeWidth: '20%',
                },
              },
              title: 'Relative value',
            },
          ],
          title: 'strokeWidth',
        },
        {
          examples: [
            {
              keyframes: {
                to: {
                  strokeOpacity: 0,
                },
              },
              props: {
                strokeWidth: 10,
              },
              title: 'Absolute value',
            },
          ],
          title: 'strokeOpacity',
        },
        {
          examples: [
            {
              description:
                'Does not animate and this is a correct behavior (the same as on the web)',
              keyframes: {
                to: {
                  strokeDasharray: 10,
                },
              },
              props: {
                strokeWidth: 5,
              },
              title: 'From default to single value',
            },
            {
              description:
                'Animates properly if values are specified in all keyframes',
              keyframes: {
                from: {
                  strokeDasharray: 0,
                },
                to: {
                  strokeDasharray: 10,
                },
              },
              props: {
                strokeWidth: 5,
              },
              title: 'From single to single value',
            },
            {
              description:
                'Uses `10` as the `from` keyframe value (always the first element of the second keyframe in the interpolation pair if the first one is empty)',
              keyframes: {
                to: {
                  strokeDasharray: [10, 20, 30],
                },
              },
              props: {
                strokeWidth: 5,
              },
              title: 'Array value',
            },
            {
              keyframes: {
                from: {
                  strokeDasharray: [10, 20],
                },
                to: {
                  strokeDasharray: [50, 30, 10],
                },
              },
              props: {
                strokeWidth: 5,
              },
              title: 'Array value with different number of elements',
            },
          ],
          title: 'strokeDasharray',
        },
        {
          examples: [
            {
              description:
                '`strokeDashArray` is set to `10` and `strokeWidth` is set to `5`',
              keyframes: {
                to: {
                  strokeDashoffset: 100,
                },
              },
              props: {
                strokeDasharray: 10,
                strokeWidth: 5,
              },
              title: 'Absolute value',
            },
          ],
          title: 'strokeDashoffset',
        },
        {
          examples: [
            {
              description:
                '`strokeDashArray` is set to `10` and `strokeWidth` is set to `5`',
              keyframes: {
                from: {
                  strokeLinecap: 'butt',
                },
                // eslint-disable-next-line perfectionist/sort-objects
                '50%': {
                  strokeLinecap: 'round',
                },
                to: {
                  strokeLinecap: 'square',
                },
              },
              props: {
                strokeDasharray: 20,
                strokeWidth: 15,
              },
              title: 'Changing `strokeLinecap`',
            },
          ],
          title: 'strokeLinecap',
        },
        {
          examples: [
            {
              keyframes: {
                from: {
                  strokeLinejoin: 'miter',
                },
                // eslint-disable-next-line perfectionist/sort-objects
                '50%': {
                  strokeLinejoin: 'round',
                },
                to: {
                  strokeLinejoin: 'bevel',
                },
              },
              render: (props) => (
                <Svg height={100} viewBox="0 0 6 6" width={100}>
                  <AnimatedPath
                    d="M1,5 a2,2 0,0,0 2,-3 a3,3 0 0 1 2,3.5"
                    fill="none"
                    stroke={colors.primaryDark}
                    {...props}
                  />
                </Svg>
              ),
              title: 'Changing `strokeLinejoin`',
            },
          ],
          title: 'strokeLinejoin',
        },
        // TODO - this prop doesn't work in RN SVG so the example is commented
        // out for now
        // {
        //   title: 'strokeMiterlimit',
        //   examples: [
        //     {
        //       CardComponent: VerticalExampleCard,
        //       keyframes: {
        //         from: {
        //           strokeMiterlimit: 1,
        //         },
        //         to: {
        //           strokeMiterlimit: 8,
        //         },
        //       },
        //       render: (props) => (
        //         <Svg height={150} viewBox="0 0 38 30" width={200}>
        //           <AnimatedPath
        //             fill="none"
        //             stroke={colors.primaryDark}
        //             strokeLinejoin="miter"
        //             strokeMiterlimit={10}
        //             d="M1,19 l7   ,-3 l7   ,3
        //                m2, 0 l3.5 ,-3 l3.5 ,3
        //                m2, 0 l2   ,-3 l2   ,3
        //                m2, 0 l0.75,-3 l0.75,3
        //                m2, 0 l0.5 ,-3 l0.5 ,3"
        //             {...props}
        //           />
        //         </Svg>
        //       ),
        //       title: 'Changing `strokeMiterlimit`',
        //     },
        //   ],
        // },
        {
          examples: [
            {
              keyframes: {
                from: {
                  vectorEffect: 'none',
                },
                to: {
                  vectorEffect: 'nonScalingStroke',
                },
              },
              render: (props) => (
                <Svg height={150} viewBox="0 0 400 240" width={200}>
                  <AnimatedPath
                    d="M10,20 L40,100 L39,200 z"
                    fill="none"
                    stroke={colors.primaryDark}
                    strokeWidth={5}
                    transform="translate(100,0) scale(4,1)"
                    {...props}
                  />
                </Svg>
              ),
              title: 'Changing `strokeMiterlimit`',
            },
          ],
          title: 'vectorEffect',
        },
      ]}
    />
  );
}
