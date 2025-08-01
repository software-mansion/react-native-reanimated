import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function ExtrapolationExample() {
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onChange((event) => {
      translateY.value += event.changeY;
    })
    .onEnd(() => {
      translateY.value = withTiming(0);
    });

  const button1Style = useAnimatedStyle(() => {
    const translateX = Math.round(
      interpolate(translateY.value, [0, -75], [0, -75], {
        extrapolateLeft: Extrapolation.CLAMP,
        extrapolateRight: Extrapolation.EXTEND,
      })
    );

    return {
      transform: [{ translateX }, { translateY: translateY.value }],
    };
  });
  const button2Style = useAnimatedStyle(() => {
    const transY = Math.round(
      interpolate(translateY.value, [0, -75], [0, -150], {
        extrapolateLeft: Extrapolation.CLAMP,
        extrapolateRight: Extrapolation.EXTEND,
      })
    );

    return {
      transform: [{ translateY: transY }],
    };
  });

  const button3Style = useAnimatedStyle(() => {
    const translateX = Math.round(
      interpolate(translateY.value, [0, -75], [0, 75], {
        extrapolateLeft: Extrapolation.CLAMP,
        extrapolateRight: Extrapolation.EXTEND,
      })
    );

    return {
      transform: [{ translateX }, { translateY: translateY.value }],
    };
  });

  const stylez = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.circle, styles.topCircle, stylez]} />
      </GestureDetector>
      <Animated.View style={[styles.circle, button1Style]} />
      <Animated.View style={[styles.circle, button2Style]} />
      <Animated.View style={[styles.circle, button3Style]} />
    </>
  );
}

const styles = StyleSheet.create({
  topCircle: {
    zIndex: 1,
    backgroundColor: '#001a72',
  },
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
