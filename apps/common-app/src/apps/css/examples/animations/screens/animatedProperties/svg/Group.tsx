import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
// TODO: Fix me
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Circle, G, type GProps, Rect, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedG = Animated.createAnimatedComponent(G);

export default function GroupExample() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes<GProps> }, GProps>
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} width={100}>
          {/* TODO: Remove the requirement of passing the animated prop
              inline - it should work without setting it on the component */}
          <AnimatedG animatedProps={animation} fill={colors.primary}>
            <Circle cx={30} cy={50} r={20} />
            <Rect height={30} width={30} x={55} y={35} />
          </AnimatedG>
        </Svg>
      )}
      tabs={[
        {
          name: 'Appearance',
          sections: [
            {
              examples: [
                {
                  description:
                    'Animating opacity on a group affects all its children',
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
                  description:
                    'Animating fill on a group cascades to all children. Note: the animated prop (e.g. `fill`) must also be passed inline on the component for the animation to work.',
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
        {
          name: 'Stroke',
          sections: [
            {
              examples: [
                {
                  keyframes: {
                    from: {
                      stroke: 'transparent',
                      strokeWidth: 0,
                    },
                    to: {
                      stroke: 'red',
                      strokeWidth: 3,
                    },
                  },
                  title: 'Stroke color and width',
                },
                {
                  keyframes: {
                    to: {
                      strokeOpacity: 0.2,
                    },
                  },
                  title: 'Stroke opacity',
                },
              ],
              title: 'Stroke',
            },
          ],
        },
      ]}
    />
  );
}
