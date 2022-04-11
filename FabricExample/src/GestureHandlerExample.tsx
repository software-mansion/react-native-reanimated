import React from 'react';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function Ball() {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: withSpring(isPressed.value ? 1.2 : 1) },
      ],
      backgroundColor: isPressed.value ? 'yellow' : 'blue',
    };
  });

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onBegin(() => {
      'worklet';
      isPressed.value = true;
    })
    .onChange((e) => {
      'worklet';
      offset.value = {
        x: e.changeX + offset.value.x,
        y: e.changeY + offset.value.y,
      };
    })
    .onFinalize(() => {
      'worklet';
      isPressed.value = false;
    })
    .onTouchesMove((e, state) => {
      state.activate();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.ball, animatedStyles]} />
    </GestureDetector>
  );
}

export default function Example() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Ball />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ball: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'blue',
    alignSelf: 'center',
  },
});
