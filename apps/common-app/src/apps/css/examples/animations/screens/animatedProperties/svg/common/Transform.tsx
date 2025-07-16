import type { CSSAnimationKeyframes } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import Svg, { Circle, type TransformProps } from 'react-native-svg';

import { ExamplesScreen } from '@/apps/css/components';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TransformExample() {
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
            animatedProps={animation}
            cx={50}
            cy={50}
            fill={colors.primary}
            r={20}
            stroke={colors.primaryDark}
          />
        </Svg>
      )}
      tabs={[
        {
          name: 'translate',
          sections: [],
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
