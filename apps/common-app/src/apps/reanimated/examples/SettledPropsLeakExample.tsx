import React, { forwardRef } from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

// Repro for https://github.com/software-mansion/react-native-reanimated/issues/10134
// With FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS enabled, settled animation
// values used to leak into the wrapped component's top-level props, crashing
// components that give their own meaning to props like `backgroundColor`
// (e.g. @shopify/restyle, where it's a theme token).
const Box = forwardRef<
  React.ComponentRef<typeof View>,
  ViewProps & { backgroundColor?: string }
>(({ backgroundColor, ...rest }, ref) => {
  if (backgroundColor !== undefined) {
    throw new Error(
      `Wrapped component received animated style value backgroundColor=${backgroundColor} as a top-level prop`
    );
  }
  return <View ref={ref} {...rest} />;
});

const AnimatedBox = Animated.createAnimatedComponent(Box);

export default function SettledPropsLeakExample() {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming('green'),
  }));

  return <AnimatedBox style={[{ width: 150, height: 150 }, animatedStyle]} />;
}
