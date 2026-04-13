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
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<GProps>; props?: GProps },
      GProps
    >
      buildAnimation={({ keyframes }) => ({
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationName: keyframes,
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation, props }) => (
        <Svg height={100} width={100}>
          <AnimatedG animatedProps={animation} {...props}>
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
                  props: {
                    fill: colors.primary,
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
                  props: {
                    fill: colors.primary, // TODO - remove the necessity of passing animated props separately as inline props
                  },
                  title: 'Fill color',
                },
                {
                  keyframes: {
                    to: {
                      fillOpacity: 0.2,
                    },
                  },
                  props: {
                    fill: colors.primary,
                    fillOpacity: 1, // TODO - remove the necessity of passing animated props separately as inline props
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
                      stroke: 'blue',
                      strokeWidth: 0,
                    },
                    to: {
                      stroke: 'red',
                      strokeWidth: 10,
                    },
                  },
                  props: {
                    stroke: colors.primary, // TODO - remove the necessity of passing animated props separately as inline props
                    strokeWidth: 1, // TODO - remove the necessity of passing animated props separately as inline props
                  },
                  title: 'Stroke color and width',
                },
                {
                  keyframes: {
                    to: {
                      strokeOpacity: 0.2, // TODO - remove the necessity of passing animated props separately as inline props
                    },
                  },
                  props: {
                    stroke: colors.primary,
                    strokeOpacity: 1, // TODO - remove the necessity of passing animated props separately as inline props
                    strokeWidth: 10,
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
