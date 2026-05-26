/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type tests for `useAnimatedStyle` callbacks that return different style
 * shapes from different branches — TypeScript struggles to infer a single
 * `Style` generic that covers a union of return types. The non-generic overload
 * (default `Style = DefaultStyle`) ensures these cases type-check without the
 * user having to annotate the callback return.
 */
import React from 'react';

import Animated, { useAnimatedStyle, useSharedValue, withTiming } from '..';

function ConditionalEarlyReturnEmpty() {
  const open = useSharedValue(false);
  const style = useAnimatedStyle(() => {
    if (!open.value) {
      return { opacity: 0 };
    }
    return { opacity: 1, width: 200, height: 100 };
  });
  return <Animated.View style={style} />;
}

function ConditionalWithDifferentTransformShapes() {
  const flag = useSharedValue(0);
  const style = useAnimatedStyle(() => {
    if (flag.value > 0) {
      return { transform: [{ translateX: 10 }] };
    }
    return { transform: [{ scale: 0.5 }, { rotate: '90deg' }] };
  });
  return <Animated.View style={style} />;
}

function ConditionalWithAnimationValues() {
  const open = useSharedValue(false);
  const style = useAnimatedStyle(() => {
    if (!open.value) {
      return { opacity: withTiming(0) };
    }
    return {
      opacity: withTiming(1),
      width: withTiming(200),
    };
  });
  return <Animated.View style={style} />;
}

function SwitchOverManyShapes() {
  const mode = useSharedValue<'a' | 'b' | 'c'>('a');
  const style = useAnimatedStyle(() => {
    switch (mode.value) {
      case 'a':
        return { width: 100 };
      case 'b':
        return { width: 200, height: 50 };
      case 'c':
      default:
        return { opacity: 0.5 };
    }
  });
  return <Animated.View style={style} />;
}
