import { useRef } from 'react';
import { describe, expect, test } from 'tstyche';

import type Animated from '..';
import {
  dispatchCommand,
  measure,
  scrollTo,
  setGestureState,
  useAnimatedRef,
} from '..';

describe('measure', () => {
  test('accepts an animated ref', () => {
    const animatedRef = useAnimatedRef<Animated.View>();
    expect(measure).type.toBeCallableWith(animatedRef);
  });

  test('rejects a plain ref', () => {
    const plainRef = useRef<Animated.View>(null);
    expect(measure).type.not.toBeCallableWith(plainRef);
  });
});

describe('dispatchCommand', () => {
  test('accepts an animated ref with a command and args', () => {
    const animatedRef = useAnimatedRef<Animated.View>();
    expect(dispatchCommand).type.toBeCallableWith(
      animatedRef,
      'command',
      [1, 2, 3]
    );
  });

  test('works without command arguments', () => {
    const animatedRef = useAnimatedRef<Animated.View>();
    expect(dispatchCommand).type.toBeCallableWith(animatedRef, 'command');
  });

  test('rejects a plain ref', () => {
    const plainRef = useRef<Animated.View>(null);
    expect(dispatchCommand).type.not.toBeCallableWith(
      plainRef,
      'command',
      [1, 2, 3]
    );
  });
});

describe('scrollTo', () => {
  test('accepts an animated scroll view ref', () => {
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    expect(scrollTo).type.toBeCallableWith(animatedRef, 0, 0, true);
  });

  test('rejects a plain ref', () => {
    const plainRef = useRef<Animated.ScrollView>(null);
    expect(scrollTo).type.not.toBeCallableWith(plainRef, 0, 0, true);
  });
});

describe('setGestureState', () => {
  test('accepts a handler tag and a new state', () => {
    expect(setGestureState).type.toBeCallableWith(1, 2);
  });
});
