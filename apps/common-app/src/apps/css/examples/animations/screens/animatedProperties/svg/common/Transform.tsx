import { useEffect } from 'react';
import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg, type TransformProps } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle, {
  jsProps: ['translateX'],
});

export default function TransformExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [sv]);

  const animatedProps = useAnimatedProps(() => ({
    // transform: sv.value,
  }));

  return (
    <ExamplesScreen<
      { keyframes: CSSAnimationKeyframes<TransformProps> },
      TransformProps
    >
      buildAnimation={({ keyframes }) => ({
        animationName: keyframes,
        animationDuration: '1s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'linear',
      })}
      renderExample={({ animation }) => (
        <Svg height={100} viewBox="0 0 100 100" width={100}>
          <AnimatedCircle
            animatedProps={animatedProps}
            cx={50}
            cy={50}
            fill={colors.primary}
            r={20}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'translate',
          sections: [
            {
              title: 'translate',
              examples: [
                {
                  keyframes: {
                    from: {
                      translateX: 0,
                      translateY: 0,
                    },
                    to: {
                      translateX: 100,
                      translateY: 100,
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          name: 'origin',
          sections: [],
        },
        {
          name: 'scale',
          sections: [],
        },
        {
          name: 'rotate',
          sections: [],
        },
        {
          name: 'skew',
          sections: [],
        },
        {
          name: 'other',
          sections: [],
        },
      ]}
    />
  );
}
