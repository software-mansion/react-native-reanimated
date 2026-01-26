import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import {
  Defs,
  RadialGradient,
  // RadialGradientProps,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';

import { type RadialGradientProps } from 'react-native-reanimated';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';
import { color } from '@/apps/reanimated/examples/RuntimeTests/ReJest/utils/stringFormatUtils';
import { opacity } from 'react-native-reanimated/lib/typescript/Colors';

const AnimatedStop = Animated.createAnimatedComponent(Stop);
const AnimatedGrad = Animated.createAnimatedComponent(RadialGradient);

export default function StopExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<RadialGradientProps> },
      RadialGradientProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={300} width={300}>
          <Defs>
            <AnimatedGrad
              animatedProps={animation}
              id="radialGrad"
              r="50%"
              cx="25%"
              cy="25%"
              gradientUnits="objectBoundingBox"></AnimatedGrad>
          </Defs>
          {
            <Rect
              fill={'url(#radialGrad)'}
              height={100}
              width={100}
              x={100}
              y={100}
            />
          }
        </Svg>
      )}
      tabs={[
        {
          name: 'Pretty',
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
                  title: 'Night and day',
                  description:
                    'Transitioning from a simple 2-stop sun to a complex sunset (with more stops).',
                  keyframes: {
                    from: {
                      gradient: [
                        { offset: '0%', color: '#fdbb2d', opacity: 1 }, 
                        { offset: '100%', color: '#22c1c3', opacity: 1 }, 
                      ],
                    },
                    to: {
                      gradient: [
                        { offset: '0%', color: '#fdbb2d', opacity: 1 }, 
                        { offset: '30%', color: '#b21f1f', opacity: 1 },
                        { offset: '60%', color: '#1a2a6c', opacity: 1 }, 
                        { offset: '100%', color: '#000000', opacity: 1 }, 
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
                {
                  title: 'Opacity test',
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
              title: 'TMP',
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
                    'Focal point has to remain in the circle to avoid bugs like this',
                  keyframes: {
                    from: {
                      // cx: '50%',
                      // cy: '50%',
                      // fx: '50%',
                      // fy: '50%',

                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      // cx: '50%',
                      // cy: '50%',
                      // fx: '20%',
                      // fy: '20%', // current processor is order dependent
                      r: '20%',
                      rx: '50%',
                      ry: '50%',
                      
                      gradient: [
                        { offset: '0%', color: 'red', opacity: 1 },
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
                  title: 'Horizontal Scanner',
                  description: 'Moves cx from left to right.',
                  keyframes: {
                    from: {
                      fx: '50%',
                      fy: '50%',
                      cx: '10%',
                      cy: '50%',
                      r: '30%',
                      gradient: [
                        { offset: '0%', color: 'white', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                    to: {
                      fx: '50%',
                      fy: '50%',
                      cx: '90%',
                      cy: '50%',
                      r: '30%',
                      gradient: [
                        { offset: '0%', color: 'white', opacity: 1 },
                        { offset: '100%', color: 'blue', opacity: 1 },
                      ],
                    },
                  },
                },
                {
                  title: 'Horizontal Scanner',
                  description:
                    'Moves cx from left to right. Tests percentage-based coordinate interpolation.',
                  keyframes: {
                    from: {
                      cx: '10%',
                      cy: '50%',
                      r: '30%',
                      gradient: [
                        // { offset: '0%', color: 'white', opacity: 1 },
                      ],
                    },
                    to: {
                      cx: '90%',
                      cy: '50%',
                      r: '30%',
                      gradient: [{ offset: '0%', color: 'blue', opacity: 1 }],
                    },
                  },
                },
              ],
              title: 'Absolute',
            },
          ],
        },
      ]}
    />
  );
}
