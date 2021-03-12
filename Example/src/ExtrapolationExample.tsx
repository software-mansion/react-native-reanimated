import React from 'react';
import { StyleSheet } from 'react-native';

import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
  Extrapolate,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

function ExtrapolationExample(): React.ReactElement {
  const translation = {
    x: useSharedValue(50),
    y: useSharedValue(0),
  };
  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = translation.x.value;
      ctx.startY = translation.y.value;
    },
    onActive: (event, ctx) => {
      translation.x.value = ctx.startX + event.translationX;
      translation.y.value = ctx.startY + event.translationY;
    },
    onEnd: (_) => {
      translation.x.value = withTiming(50);
      translation.y.value = withTiming(0);
    },
  });

  const button1Style = useAnimatedStyle(() => {
    const translateX = Math.round(
      interpolate(translation.y.value, [0, -75], [0, -75], {
        extrapolateLeft: Extrapolate.CLAMP,
        extrapolateRight: Extrapolate.EXTEND,
      })
    );

    return {
      transform: [{ translateX }, { translateY: translation.y.value }],
    };
  });
  const button2Style = useAnimatedStyle(() => {
    const translateY = Math.round(
      interpolate(translation.y.value, [0, -75], [0, -150], {
        extrapolateLeft: Extrapolate.CLAMP,
        extrapolateRight: Extrapolate.EXTEND,
      })
    );

    return {
      transform: [{ translateY }],
    };
  });

  const button3Style = useAnimatedStyle(() => {
    const translateX = Math.round(
      interpolate(translation.y.value, [0, -75], [0, 75], {
        extrapolateLeft: Extrapolate.CLAMP,
        extrapolateRight: Extrapolate.EXTEND,
      })
    );

    return {
      transform: [{ translateX }, { translateY: translation.y.value }],
    };
  });

  const stylez = useAnimatedStyle(() => ({
    transform: [{ translateY: translation.y.value }],
  }));

  return (
    <>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={[
            styles.circle,
            { zIndex: 1, backgroundColor: '#001a72' },
            stylez,
          ]}
        />
      </PanGestureHandler>
      <Animated.View style={[styles.circle, button1Style]} />
      <Animated.View style={[styles.circle, button2Style]} />
      <Animated.View style={[styles.circle, button3Style]} />
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 50,
    height: 50,
    position: 'absolute',
    top: 400,
    alignSelf: 'center',
    borderRadius: 25,
    backgroundColor: 'red',
  },
});

export default ExtrapolationExample;
