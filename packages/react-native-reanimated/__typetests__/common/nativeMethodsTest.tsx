/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useRef } from 'react';
import type Animated from '../../src';
import {
  useAnimatedRef,
  dispatchCommand,
  measure,
  scrollTo,
  setGestureState,
} from '../../src';

function NativeMethodsTest() {
  function MeasureTest() {
    const animatedRef = useAnimatedRef<Animated.View>();
    measure(animatedRef);
    const plainRef = useRef<Animated.View>();
    // @ts-expect-error it should only work for Animated refs
    measure(plainRef);
  }

  function DispatchCommandTest() {
    const animatedRef = useAnimatedRef<Animated.View>();
    dispatchCommand(animatedRef, 'command', [1, 2, 3]);
    const plainRef = useRef<Animated.View>();
    // @ts-expect-error it should only work for Animated refs
    dispatchCommand(plainRef, 'command', [1, 2, 3]);
    // it should work without arguments
    dispatchCommand(animatedRef, 'command');
  }

  function ScrollToTest() {
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    scrollTo(animatedRef, 0, 0, true);
    const plainRef = useRef<Animated.ScrollView>();
    // @ts-expect-error it should only work for Animated refs
    scrollTo(plainRef, 0, 0, true);
    const animatedViewRef = useAnimatedRef<Animated.View>();
  }

  function SetGestureStateTest() {
    setGestureState(1, 2);
  }
}
