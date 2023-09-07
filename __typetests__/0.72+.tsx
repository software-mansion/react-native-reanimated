/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import Animated, { useSharedValue, useAnimatedStyle } from '..';

/*
This file is needed because our code depends on types of React Native
and there are some tests that check the newer types - these tests do not work
on older versions of React Native. Currently I just moved relevant tests here
without changing their names to point out what are their respective counterparts.
In the future this might change.
*/

function TestUseAnimatedStyleStyle2() {
  const sv = useSharedValue('0');
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: sv.value,
    };
  });
  return <Animated.View style={animatedStyle} />;
}

function TestUseAnimatedStyleStyle4() {
  const sv = useSharedValue({ width: '0' });
  // @ts-expect-error properly detects illegal type
  const animatedStyle = useAnimatedStyle(() => {
    return sv.value;
  });
  return <Animated.View style={animatedStyle} />;
}

function TestInlineStyles4() {
  const sv = useSharedValue('0');
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={{ width: sv }} />;
}

function TestInlineStyles6() {
  const sv = useSharedValue({ width: '0' });
  // @ts-expect-error properly detects illegal type
  return <Animated.View style={sv} />;
}
