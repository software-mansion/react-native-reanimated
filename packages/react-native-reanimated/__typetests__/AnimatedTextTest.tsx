/* eslint-disable @typescript-eslint/no-unused-vars */

import type React from 'react';

import Animated, { useAnimatedProps, useSharedValue } from '..';

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

  function ChildrenStringTest() {
    const sv = useSharedValue('string');
    return <Animated.Text>{sv}</Animated.Text>;
  }

  function ChildrenNumberTest() {
    const sv = useSharedValue(123);
    return <Animated.Text>{sv}</Animated.Text>;
  }

  function MixedChildrenStringTest() {
    const sv = useSharedValue('string');
    return <Animated.Text>Before {sv} After</Animated.Text>;
  }

  function MixedChildrenNumberTest() {
    const sv = useSharedValue(123);
    return <Animated.Text>Before {sv} After</Animated.Text>;
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

  function InlinePropWithSharedValueChildrenTest() {
    const sv = useSharedValue('string');
    // @ts-expect-error We don't want to accept text prop when children are present
    return <Animated.Text text={sv}>{sv}</Animated.Text>;
  }

  function InlinePropWithMixedChildrenTest() {
    const sv = useSharedValue('string');
    // @ts-expect-error We don't want to accept text prop when children are present
    return <Animated.Text text={sv}>Before {sv} After</Animated.Text>;
  }

  function AnimatedPropsWithSharedValueChildrenTest() {
    const sv = useSharedValue('string');
    const animatedProps = useAnimatedProps(() => ({ text: 'string' }));
    // @ts-expect-error We don't want to accept text in animatedProps when children are present
    return <Animated.Text animatedProps={animatedProps}>{sv}</Animated.Text>;
  }
}
