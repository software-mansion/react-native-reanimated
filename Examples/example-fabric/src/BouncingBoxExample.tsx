import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import React from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function BouncingBoxExample() {
  const offset = useSharedValue(0);
  const angle = useSharedValue(0);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onChange((event) => {
      'worklet';
      offset.value = interpolate(
        event.translationX,
        [-100, -50, 0, 50, 100],
        [-30, -10, 0, 10, 30]
      );
    })
    .onFinalize(() => {
      offset.value = withSpring(0, { mass: 2, stiffness: 500 });
    });

  const rotation = Gesture.Rotation()
    .onChange((event) => {
      'worklet';
      angle.value = interpolate(
        event.rotation,
        [-1.2, -1, -0.5, 0, 0.5, 1, 1.2],
        [-0.52, -0.5, -0.3, 0, 0.3, 0.5, 0.52]
      );
    })
    .onFinalize(() => {
      angle.value = withSpring(0, { mass: 2, stiffness: 500 });
    });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value },
        { rotate: `${angle.value}rad` },
      ],
    };
  });

  const gesture = Gesture.Simultaneous(pan, rotation);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.box, animatedStyles]} />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    backgroundColor: 'navy',
  },
});
