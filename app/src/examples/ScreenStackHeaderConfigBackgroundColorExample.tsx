import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  GestureUpdateEvent,
  PanGestureChangeEventPayload,
} from 'react-native-gesture-handler';
import {
  Screen,
  ScreenStack,
  ScreenStackHeaderConfig,
} from 'react-native-screens';
import { Platform, StyleSheet, View } from 'react-native';

import React from 'react';

const AnimatedScreenStackHeaderConfig = Animated.createAnimatedComponent(
  Platform.OS === 'web'
    ? React.forwardRef(ScreenStackHeaderConfig)
    : ScreenStackHeaderConfig
);
Animated.addWhitelistedNativeProps({ title: true });

export default function ScreenStackHeaderConfigBackgroundColorExample() {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

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
