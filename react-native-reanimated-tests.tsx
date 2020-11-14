/* eslint-disable */
import React, { useState } from 'react';
import { StyleSheet, Button, View } from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandlerGestureEvent,
  PinchGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
  Easing,
  withTiming,
  withSpring,
  cancelAnimation,
  withDelay,
  withRepeat,
  withSequence,
  withDecay,
  useWorkletCallback,
  createWorklet,
  runOnUI,
  useAnimatedReaction,
  interpolateColor,
  makeMutable,
  interpolateNode,
  useValue,
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
 * Reanimated 2 Functions
 */

// makeMutable
function MakeMutableTest() {
  const mut = makeMutable(0);
  const mut2 = makeMutable(true);

  return <Animated.View style={styles.container} />;
}

/**
 * Reanimated 2 Hooks
 */

// useSharedValue
function SharedValueTest() {
  const translate = useSharedValue(0);
  const translate2 = useSharedValue(0, true);
  const translate3 = useSharedValue(0, false);

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

// useAnimatedGestureHandler with context
function AnimatedGestureHandlerTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
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

function AnimatedPinchGestureHandlerTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler<
    PinchGestureHandlerGestureEvent
  >({
    onActive: (event) => {
      x.value = event.scale;
    },
    onEnd: () => {
      x.value = withTiming(1);
    },
  });
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: x.value,
        },
      ],
    };
  });
  return (
    <PinchGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </PinchGestureHandler>
  );
}

/**
 * Reanimated 2 Animations
 */

// withTiming
function WithTimingTest() {
  const width = useSharedValue(50);
  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(width.value, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    };
  });
  return (
    <View>
      <Animated.View style={[styles.box, style]} />
      <Button onPress={() => (width.value = Math.random() * 300)} title="Hey" />
    </View>
  );
}

// withSpring
function WithSpringTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number }) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withSpring(0);
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

// cancelAnimation
function CancelAnimationTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number }) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx: { startX: number }) => {
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

// withDelay
function WithDelayTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, _ctx) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withDelay(1000, withTiming(70));
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

// withRepeat
function WithRepeatTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, _ctx) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withRepeat(withTiming(70), 1, true);
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

// withSequence
function WithSequenceTest() {
  const x = useSharedValue(0);
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, _ctx) => {
      cancelAnimation(x);
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (_) => {
      x.value = withSequence(withTiming(70), withTiming(70));
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

// withDecay
function WithDecayTest() {
  const x = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number }) => {
      ctx.startX = x.value;
    },
    onActive: (event, ctx: { startX: number }) => {
      x.value = ctx.startX + event.translationX;
    },
    onEnd: (evt) => {
      x.value = withDecay({
        velocity: evt.velocityX,
        clamp: [0, 200], // optionally define boundaries for the animation
      });
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

// useWorkletCallback
function UseWorkletCallbackTest() {
  const callback = useWorkletCallback((a: number, b: number) => {
    return a + b;
  }, []);

  runOnUI(() => {
    const res = callback(1, 1);

    console.log(res);
  })();

  return <Animated.View style={styles.container} />;
}

// createWorklet
function CreateWorkletTest() {
  const callback = createWorklet((a: number, b: number) => {
    return a + b;
  });

  runOnUI(() => {
    const res = callback(1, 1);

    console.log(res);
  })();

  return <Animated.View style={styles.container} />;
}

// useWorkletCallback
function UseAnimatedReactionTest() {
  const [state, setState] = useState();
  const sv = useSharedValue(0);

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value) => {
      console.log(value);
    }
  );

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value) => {
      console.log(value);
    },
    []
  );

  useAnimatedReaction(
    () => {
      return sv.value;
    },
    (value) => {
      console.log(value);
    },
    [state]
  );

  return null;
}

// interpolateColor
function interpolateColorTest() {
  const sv = useSharedValue(0);

  interpolateColor(sv.value, [0, 1], ['red', 'blue']);
  interpolateColor(sv.value, [0, 1], ['#00FF00', '#0000FF'], 'RGB');
  interpolateColor(sv.value, [0, 1], ['#FF0000', '#00FF99'], 'HSV');

  return null;
}

function interpolateNodeTest() {
  const value = useValue(0);
  interpolateNode(value, {
    inputRange: [0, 1],
    outputRange: ['0deg', '100deg'],
  });
}
