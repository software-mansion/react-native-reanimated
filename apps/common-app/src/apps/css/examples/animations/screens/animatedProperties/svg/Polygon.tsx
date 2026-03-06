import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Polygon, type PolygonProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export default function PolygonExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<PolygonProps> },
      PolygonProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} viewBox="0 0 100 100" width={100}>
          <AnimatedPolygon
            animatedProps={animation}
            fill={colors.primaryLight}
            points="50,10 90,90 10,90"
            stroke={colors.primary}
            strokeLinejoin="round"
            strokeWidth={3}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'Points',
          sections: [
            {
              examples: [
                {
                  description:
                    'Smooth interpolation between two triangle shapes with the same number of points',
                  keyframes: {
                    from: {
                      points: '50,10 90,90 10,90',
                    },
                    to: {
                      points: '50,90 90,10 10,10',
                    },
                  },
                  title: 'Triangle flip',
                },
                {
                  description:
                    'Smooth animation between two diamond orientations',
                  keyframes: {
                    from: {
                      points: '50,10 90,50 50,90 10,50',
                    },
                    to: {
                      points: '30,20 80,20 70,80 20,80',
                    },
                  },
                  title: 'Diamond morph',
                },
                {
                  description: 'Pentagon morphs between two rotational states',
                  keyframes: {
                    from: {
                      points: '50,5 95,35 80,90 20,90 5,35',
                    },
                    to: {
                      points: '50,95 5,65 20,10 80,10 95,65',
                    },
                  },
                  title: 'Pentagon rotation',
                },
                {
                  description:
                    'Hexagon smoothly morphs between a tall and wide shape',
                  keyframes: {
                    from: {
                      points: '50,5 85,25 85,75 50,95 15,75 15,25',
                    },
                    to: {
                      points: '50,20 90,35 90,65 50,80 10,65 10,35',
                    },
                  },
                  title: 'Hexagon breathe',
                },
              ],
              title: 'Same Number of Points',
            },
            {
              examples: [
                {
                  description:
                    'Smooth interpolation between shapes with different numbers of points (triangle to diamond)',
                  keyframes: {
                    from: {
                      points: '50,10 90,90 10,90',
                    },
                    to: {
                      points: '50,10 90,50 50,90 10,50',
                    },
                  },
                  title: 'Triangle to diamond',
                },
                {
                  description:
                    'Smooth interpolation when reducing the number of points (pentagon to triangle)',
                  keyframes: {
                    from: {
                      points: '50,5 95,35 80,90 20,90 5,35',
                    },
                    to: {
                      points: '50,10 90,90 10,90',
                    },
                  },
                  title: 'Pentagon to triangle',
                },
              ],
              title: 'Different Number of Points',
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
          ],
        },
      ]}
    />
  );
}
