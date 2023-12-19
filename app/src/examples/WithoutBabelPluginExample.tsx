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
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

enableExperimentalWebImplementation(true);

function isBabelPluginEnabled() {
  'inject Reanimated Babel plugin version';
  // @ts-ignore
  return global._REANIMATED_VERSION_BABEL_PLUGIN !== undefined;
}

export default function WithoutBabelPluginExample() {
  return (
    <View style={styles.container}>
      {isBabelPluginEnabled() && <WithBabel />}
      <WithoutBabel />
    </View>
  );
}

function WithBabel() {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: withSpring(isPressed.value ? 1.2 : 1) },
      ],
      backgroundColor: isPressed.value ? 'blue' : 'navy',
      cursor: isPressed.value ? 'grabbing' : 'grab',
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
    .onTouchesMove((_, state) => {
      state.activate();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.ball, animatedStyle]}>
        <Text style={styles.text}>I need Babel plugin</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function WithoutBabel() {
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
      backgroundColor: isPressed.value ? 'pink' : 'hotpink',
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 100,
    height: 100,
    borderRadius: 100,
    alignSelf: 'center',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
    color: 'white',
  },
});
