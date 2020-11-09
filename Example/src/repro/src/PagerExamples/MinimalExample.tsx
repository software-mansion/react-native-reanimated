import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  Easing,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { View, Button, Text } from 'react-native';
import React from 'react';
import { PanGestureHandler } from 'react-native-gesture-handler';

export default function MinimalExample() {
    const positions = [50, 250]
  const pos = useSharedValue(positions[0]);
  function stiffnessFromTension(oValue) {
    return (oValue - 30) * 3.62 + 194;
  }

  function dampingFromFriction(oValue) {
    return (oValue - 8) * 3 + 25;
  }

  const config = {
    stiffness: stiffnessFromTension(400),
    damping: dampingFromFriction(50),
    mass: 5,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  };

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: pos.value }, { translateY: 150 }],
    };
  });

  const handler = useAnimatedGestureHandler({
    onEnd: (e, ctx) => {
      const v = e.velocityX;
      if (v > 0 && pos.value === positions[0]) {
        pos.value = withSpring(positions[1], config);
      } else if (v < 0 && pos.value === positions[1]) {
        pos.value = withSpring(positions[0], config);
      }
    },
  });

  return (
    <View>
      <PanGestureHandler onGestureEvent={handler}>
        <Animated.View
          style={[
            { width: 100, height: 100, backgroundColor: 'purple' },
            style,
          ]}
        />
      </PanGestureHandler>
    </View>
  );
}
