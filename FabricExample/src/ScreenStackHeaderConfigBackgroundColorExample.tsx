import React from 'react';
import {
  ScreenStack,
  Screen,
  ScreenStackHeaderConfig,
} from 'react-native-screens';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  PanGestureChangeEventPayload,
  GestureUpdateEvent,
} from 'react-native-gesture-handler';
// import { useJSThreadKiller } from './useJSThreadKiller';

const AnimatedScreenStackHeaderConfig = Animated.createAnimatedComponent(
  ScreenStackHeaderConfig
);

export default function ScreenStackHeaderConfigBackgroundColorExample() {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

  // useJSThreadKiller();

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      isPressed.value = true;
    })
    .onChange((e: GestureUpdateEvent<PanGestureChangeEventPayload>) => {
      'worklet';
      offset.value = {
        x: e.changeX + offset.value.x,
        y: e.changeY + offset.value.y,
      };
    })
    .onFinalize(() => {
      'worklet';
      isPressed.value = false;
    });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
      ],
      backgroundColor: isPressed.value ? 'gray' : 'black',
    };
  });

  const animatedProps = useAnimatedProps(() => {
    const h = Math.max(0, Math.min(360, Math.round(180 + offset.value.x)));
    const l = Math.max(0, Math.min(100, Math.round(50 - offset.value.y / 5)));
    const color = `hsl(${h}, 100%, ${l}%)`;
    return {
      backgroundColor: color,
      title: color,
    };
  }, [offset]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ScreenStack style={styles.container}>
        <Screen>
          <AnimatedScreenStackHeaderConfig animatedProps={animatedProps} />
          <View style={styles.container}>
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.ball, animatedStyles]} />
            </GestureDetector>
          </View>
        </Screen>
      </ScreenStack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'black',
  },
});
