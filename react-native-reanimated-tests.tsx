/* eslint-disable */
import React from 'react';
import { StyleSheet, Button, View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    height: 50,
    backgroundColor: 'blue',
  },
});

/**
 * Reanimated 1
 */

// @TODO: add reanimated 1 tests here

/**
 * Reanimated 2
 */

// useSharedValue
function SharedValueTest() {
  const translate = useSharedValue(0);
  return <Animated.View style={styles.container} />;
}

// useAnimatedStyle
function AnimatedStyleTest() {
  const width = useSharedValue(50);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
    };
  });
  return <Animated.View style={[styles.box, animatedStyle]} />;
}

// useDerivedValue
function DerivedValueTest() {
  const progress = useSharedValue(0);
  const width = useDerivedValue(() => {
    return progress.value * 250;
  });

  return (
    <Button title="Random" onPress={() => (progress.value = Math.random())} />
  );
}

// useAnimatedScrollHandler
function AnimatedScrollHandlerTest() {
  const translationY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    translationY.value = event.contentOffset.y;
  });
  const stylez = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translationY.value,
        },
      ],
    };
  });
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, stylez]} />
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} />
    </View>
  );
}

// useAnimatedGestureHandler
function AnimatedGestureHandlerTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = 0;
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: x.value,
        },
      ],
    };
  });
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PanGestureHandler>
  );
}
