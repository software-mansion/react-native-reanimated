import React from 'react';
import { View, Text } from 'react-native';

import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function ExtrapolationExample() {
  const translation = {
    x: useSharedValue(50),
    y: useSharedValue(0),
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translation.x.value;
      ctx.startY = translation.y.value;
    },
    onActive: (event, ctx) => {
      translation.x.value = ctx.startX + event.translationX;
      translation.y.value = ctx.startY + event.translationY;
    },
    onEnd: (_) => {
      translation.x.value = withSpring(50);
      translation.y.value = withSpring(0);
    },
  });

  const stylez = useAnimatedStyle(() => {
    const height = Math.round(
      interpolate(translation.x.value, [0, 25], [75, 100], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      })
    );

    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
      ],
      height,
    };
  });

  return (
    <View style={{ flex: 1, margin: 50 }}>
      <View
        style={{
          flexDirection: 'row',
        }}>
        <Text style={{ position: 'absolute' }}>
          Extrapolate Left: Clamp | Extrapolate Right: Extend
        </Text>
      </View>
      <View
        style={{
          alignSelf: 'center',
          position: 'absolute',
          borderWidth: 1,
          height: 500,
        }}
      />

      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={[
            {
              // position: 'absolute',
              top: 200,
              left: 120,
              width: 40,
              height: 40,
              backgroundColor: '#001a72',
            },
            stylez,
          ]}
        />
      </PanGestureHandler>
    </View>
  );
}

export default ExtrapolationExample;
