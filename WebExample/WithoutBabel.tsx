import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  enableExperimentalWebImplementation,
} from 'react-native-gesture-handler';
import { StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';

enableExperimentalWebImplementation(true);

export function WithoutBabelTest() {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

  const [stateObject, rerender] = useState({});

  const stateNumber = Math.random();
  const stateBoolean = stateNumber >= 0.5;

  console.log('[without-babel][render]');

  useEffect(function updateState() {
    const interval = setInterval(() => {
      rerender({});
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: withSpring(isPressed.value ? 1.2 : 1) },
      ],
      backgroundColor: isPressed.value ? 'cyan' : 'hotpink',
      cursor: isPressed.value ? 'grabbing' : 'grab',
    };
  }, [isPressed, offset, stateObject, stateBoolean, stateNumber]);

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
    .onTouchesMove((_, state) => {
      state.activate();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.ball, animatedStyle]}>
        <Text style={styles.text}>I work without Babel</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  ball: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'hotpink',
    alignSelf: 'center',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
