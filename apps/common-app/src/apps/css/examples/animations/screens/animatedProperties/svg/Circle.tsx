import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import { Circle, type CircleProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// TODO - fix animation without keyframe value - should animate to the value from the component props
// instead of a default value
export default function CircleExample() {
  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<CircleProps> },
      CircleProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} width={100}>
          <AnimatedCircle animatedProps={animation} cx={50} cy={50} r={20} />
        </Svg>
      )}
      sections={[
        {
          examples: [
            {
              keyframes: {
                to: {
                  r: 50,
                },
              },
              title: 'Changing Circle Radius',
            },
          ],
          title: 'Circle Radius',
        },
        {
          examples: [
            {
              keyframes: {
                to: {
                  cx: 0,
                },
              },
              title: 'Absolute value',
            },
            {
              keyframes: {
                to: {
                  cx: '100%',
                },
              },
              title: 'Relative value',
            },
          ],
          title: 'Circle Center X',
        },
        {
          examples: [
            {
              keyframes: {
                to: {
                  cy: 0,
                },
              },
              title: 'Absolute value',
            },
            {
              keyframes: {
                to: {
                  cy: '100%',
                },
              },
              title: 'Relative value',
            },
          ],
          title: 'Circle Center Y',
        },
      ]}
    />
  );
}
