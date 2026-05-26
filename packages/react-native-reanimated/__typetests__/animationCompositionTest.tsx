/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests verifying that animation builders compose cleanly through the
 * value type. Each builder is generic in its underlying value type (V), so
 * `withTiming(100)` is statically known to animate a `number`, while
 * `withTiming('rgba(0,0,0,1)')` animates a `string`. Higher-order builders
 * (`withSequence`, `withDelay`, `withRepeat`, `withClamp`) carry that value
 * type through their composition.
 */
import React from 'react';
import { View } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withClamp,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from '..';

function WithSequenceComposition() {
  function NumericSequence() {
    const sv = useSharedValue(0);
    const style = useAnimatedStyle(() => ({
      width: withSequence(
        withTiming(0, { duration: 100 }),
        withTiming(100, { duration: 100 }),
        withSpring(sv.value)
      ),
    }));
    return <Animated.View style={style} />;
  }

  function StringSequence() {
    const style = useAnimatedStyle(() => ({
      backgroundColor: withSequence(
        withTiming('red'),
        withTiming('rgba(0,0,0,1)')
      ),
    }));
    return <Animated.View style={style} />;
  }
}

function WithDelayComposition() {
  const style = useAnimatedStyle(() => ({
    opacity: withDelay(100, withTiming(1)),
    width: withDelay(100, withSpring(200)),
  }));
  return <Animated.View style={style} />;
}

function WithRepeatComposition() {
  const style = useAnimatedStyle(() => ({
    opacity: withRepeat(withTiming(1), 3, true),
    transform: [{ scale: withRepeat(withSpring(1.5), -1, true) }],
  }));
  return <Animated.View style={style} />;
}

function WithClampComposition() {
  const style = useAnimatedStyle(() => ({
    width: withClamp({ min: 0, max: 100 }, withSpring(80)),
  }));
  return <Animated.View style={style} />;
}

function NestedHigherOrderAnimations() {
  // withDelay -> withSequence -> withTiming
  const style = useAnimatedStyle(() => ({
    opacity: withDelay(
      200,
      withSequence(withTiming(0, { duration: 100 }), withTiming(1))
    ),
    // withRepeat -> withSequence -> withTiming
    transform: [
      {
        translateX: withRepeat(
          withSequence(withTiming(-10), withTiming(10), withTiming(0)),
          -1
        ),
      },
    ],
  }));
  return <Animated.View style={style} />;
}
