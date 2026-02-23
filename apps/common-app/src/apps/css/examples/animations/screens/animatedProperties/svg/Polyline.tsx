import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Polyline, type PolylineProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

export default function PolylineExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<PolylineProps> },
      PolylineProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} viewBox="0 0 100 100" width={100}>
          <AnimatedPolyline
            animatedProps={animation}
            fill="none"
            points="10,80 30,20 50,80 70,20 90,80"
            stroke={colors.primary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Points',
          sections: [
            {
              title: 'Same Number of Points',
              examples: [
                {
                  keyframes: {
                    from: {
                      points: '10,80 30,20 50,80 70,20 90,80',
                    },
                    to: {
                      points: '10,20 30,80 50,20 70,80 90,20',
                    },
                  },
                  title: 'Zigzag',
                  description:
                    'Smooth interpolation between two zigzag shapes with the same number of points',
                },
                {
                  keyframes: {
                    from: {
                      points: '10,50 27,20 44,50 61,80 78,50 95,20',
                    },
                    to: {
                      points: '10,50 27,80 44,50 61,20 78,50 95,80',
                    },
                  },
                  title: 'Wave',
                  description:
                    'Smooth animation between two wave phases with the same number of points',
                },
                {
                  keyframes: {
                    from: {
                      points: '10,90 10,10 90,10',
                    },
                    to: {
                      points: '90,90 10,90 90,10',
                    },
                  },
                  title: 'Corner sweep',
                  description:
                    'Points morph from one corner configuration to another',
                },
                {
                  keyframes: {
                    from: {
                      points: '10,50 30,10 50,50 70,90 90,50',
                    },
                    to: {
                      points: '10,50 30,90 50,50 70,10 90,50',
                    },
                  },
                  title: 'S-curve',
                  description:
                    'Smooth animation of an S-curve between two mirror states',
                },
              ],
            },
            {
              title: 'Different Number of Points',
              examples: [
                {
                  keyframes: {
                    from: {
                      points: '10,80 50,20 90,80',
                    },
                    to: {
                      points: '10,80 30,20 50,80 70,20 90,80',
                    },
                  },
                  title: 'Growing polyline',
                  description:
                    'Interpolation between different numbers of points is **not supported**, so the points change **abruptly**',
                },
                {
                  keyframes: {
                    from: {
                      points: '10,50 25,20 40,80 55,20 70,80 85,20 90,50',
                    },
                    to: {
                      points: '10,50 50,20 90,50',
                    },
                  },
                  title: 'Shrinking polyline',
                  description:
                    'Reducing the number of points also causes an **abrupt** change instead of a smooth transition',
                },
              ],
            },
          ],
        },
        {
          name: 'Appearance',
          sections: [
            {
              title: 'Opacity',
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
            },
          ],
        },
      ]}
    />
  );
}
