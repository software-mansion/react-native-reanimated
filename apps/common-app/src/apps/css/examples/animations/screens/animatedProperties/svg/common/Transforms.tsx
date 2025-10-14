import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import { Rect, type RectProps, Svg } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function TransformsExample() {
  return (
    <ExamplesScreen<{ keyframes: CSSAnimationKeyframes<RectProps> }, RectProps>
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDirection: 'alternate',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} width={100}>
          <AnimatedRect
            animatedProps={animation}
            fill={colors.primary}
            height={60}
            transform={[1, 0, 0, 1, 19.16096416682005, 0]}
            width={60}
            x={20}
            y={20}
          />
        </Svg>
      )}
      sections={[
        {
          examples: [
            {
              keyframes: {
                from: {
                  transform: [{ translateX: 0 }],
                },
                to: {
                  transform: [{ translateX: 20 }],
                },
              },
              title: 'Opacity',
            },
          ],
          title: 'Opacity',
        },
      ]}
    />
  );
}
