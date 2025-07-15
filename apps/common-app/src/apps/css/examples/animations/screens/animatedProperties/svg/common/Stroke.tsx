import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Circle, type CircleProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function StrokeExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CircleProps>; props?: CircleProps },
      CircleProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation, props }) => (
        <Svg height={100} viewBox="0 0 100 100" width={100}>
          <AnimatedCircle
            // animatedProps={animation}
            cx={50}
            cy={50}
            fill={colors.primary}
            r={20}
            stroke="red"
            strokeDasharray={['10%', 20, 5]}
            strokeWidth={5}
            {...props}
          />
        </Svg>
      )}
      sections={[
        // {
        //   title: 'Stroke',
        //   examples: [
        //     {
        //       keyframes: {
        //         from: {
        //           stroke: 'blue',
        //         },
        //         to: {
        //           stroke: 'red',
        //         },
        //       },
        //       title: 'Changing stroke (color)',
        //       description: '`strokeWidth` is set to `10`',
        //       props: {
        //         strokeWidth: 10,
        //       },
        //     },
        //   ],
        // },
        // {
        //   title: 'strokeWidth',
        //   examples: [
        //     {
        //       keyframes: {
        //         to: {
        //           strokeWidth: 20,
        //         },
        //       },
        //       title: 'Absolute value',
        //     },
        //     {
        //       keyframes: {
        //         from: {
        //           strokeWidth: '10%',
        //         },
        //         to: {
        //           strokeWidth: '20%',
        //         },
        //       },
        //       title: 'Relative value',
        //       description:
        //         'The default `strokeWidth` is 1 and it is not smoothly animated to `20%`. To get a smooth animation, we need to specify a % value in all keyframes',
        //     },
        //   ],
        // },
        // {
        //   title: 'strokeOpacity',
        //   examples: [
        //     {
        //       keyframes: {
        //         to: {
        //           strokeOpacity: 0,
        //         },
        //       },
        //       props: {
        //         strokeWidth: 10,
        //       },
        //       title: 'Absolute value',
        //     },
        //   ],
        // },
        {
          title: 'strokeDasharray',
          examples: [
            {
              keyframes: {
                to: {
                  strokeDasharray: 10,
                },
              },
              title: 'Absolute value',
            },
          ],
        },
      ]}
    />
  );
}
