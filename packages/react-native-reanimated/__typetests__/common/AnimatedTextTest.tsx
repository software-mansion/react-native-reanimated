/* eslint-disable @typescript-eslint/no-unused-vars */

import type React from 'react';

import Animated, { useAnimatedProps, useSharedValue } from '../..';

function AnimatedTextTest() {
  function AnimatedPropsStringTest() {
    const animatedProps = useAnimatedProps(() => ({ text: 'string' }));
    return <Animated.Text animatedProps={animatedProps} />;
  }

  function AnimatedPropsNumberTest() {
    const animatedProps = useAnimatedProps(() => ({ text: 123 }));
    return <Animated.Text animatedProps={animatedProps} />;
  }

  function InlinePropStringTest() {
    const sv = useSharedValue('string');
    return <Animated.Text text={sv} />;
  }

  function InlinePropNumberTest() {
    const sv = useSharedValue(123);
    return <Animated.Text text={sv} />;
  }

  function AnimatedPropsWithChildrenTest() {
    const animatedProps = useAnimatedProps(() => ({ text: 'string' }));
    // @ts-expect-error We don't want to accept text in animatedProps when children are present
    return <Animated.Text animatedProps={animatedProps}>Hello</Animated.Text>;
  }

  function InlinePropWithChildrenTest() {
    const sv = useSharedValue('string');
    // @ts-expect-error We don't want to accept text prop when children are present
    return <Animated.Text text={sv}>Hello</Animated.Text>;
  }
}
