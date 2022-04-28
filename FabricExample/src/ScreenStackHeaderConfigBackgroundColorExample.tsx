import React from 'react';
import {
  ScreenStack,
  Screen,
  ScreenStackHeaderConfig,
} from 'react-native-screens';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

declare const performance: {
  now: () => number;
};

const AnimatedScreenStackHeaderConfig = Animated.createAnimatedComponent(
  ScreenStackHeaderConfig
);

export default function ScreenStackHeaderConfigBackgroundColorExample() {
  const sv = useSharedValue(0);

  React.useEffect(() => {
    sv.value = withRepeat(
      withTiming(1, { easing: Easing.linear, duration: 1000 }),
      -1
    );
    return () => {
      sv.value = 0;
    };
  }, [sv]);

  const animatedProps = useAnimatedProps(() => {
    const color = `hsl(${Math.round(sv.value * 360)}, 100%, 50%)`;
    return {
      backgroundColor: color,
      title: color,
    };
  }, []);

  return (
    <ScreenStack>
      <Screen>
        <AnimatedScreenStackHeaderConfig animatedProps={animatedProps} />
      </Screen>
    </ScreenStack>
  );
}
