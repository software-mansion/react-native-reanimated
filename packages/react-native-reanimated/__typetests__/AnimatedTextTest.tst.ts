import type { ComponentRef } from 'react';
import { createRef } from 'react';
import type { Text } from 'react-native';
import { describe, expect, test } from 'tstyche';

import type {
  CSSAnimationEvent,
  CSSTransitionEvent,
  DerivedValue,
  SharedValue,
} from '..';
import Animated, { useAnimatedRef, useAnimatedStyle } from '..';

declare const stringValue: SharedValue<string>;
declare const numberValue: SharedValue<number>;
declare const literalValue: SharedValue<'on' | 'off'>;
declare const nullableValue: SharedValue<string | number | null | undefined>;
declare const derivedString: DerivedValue<string>;
declare const derivedNumber: DerivedValue<number>;
declare const booleanValue: SharedValue<boolean>;
declare const objectValue: SharedValue<{ text: string }>;
declare const arrayValue: SharedValue<string[]>;

describe('Animated.Text', () => {
  test('accepts plain children', () => {
    expect(Animated.Text).type.toBeCallableWith({ children: 'Hello' });
    expect(Animated.Text).type.toBeCallableWith({ children: 42 });
    expect(Animated.Text).type.toBeCallableWith({ children: null });
    expect(Animated.Text).type.toBeCallableWith({
      children: ['Hello', 42, null],
    });
  });

  test('accepts a string, number or nullable shared value as a child', () => {
    expect(Animated.Text).type.toBeCallableWith({ children: stringValue });
    expect(Animated.Text).type.toBeCallableWith({ children: numberValue });
    expect(Animated.Text).type.toBeCallableWith({ children: literalValue });
    expect(Animated.Text).type.toBeCallableWith({ children: nullableValue });
  });

  test('accepts a derived value as a child', () => {
    expect(Animated.Text).type.toBeCallableWith({ children: derivedString });
    expect(Animated.Text).type.toBeCallableWith({ children: derivedNumber });
  });

  test('accepts shared values mixed with plain children', () => {
    expect(Animated.Text).type.toBeCallableWith({
      children: ['Value: ', numberValue, '%'],
    });
    expect(Animated.Text).type.toBeCallableWith({
      children: [stringValue, ' / ', derivedNumber],
    });
  });

  test('rejects shared values that are not text', () => {
    expect(Animated.Text).type.not.toBeCallableWith({ children: booleanValue });
    expect(Animated.Text).type.not.toBeCallableWith({ children: objectValue });
    expect(Animated.Text).type.not.toBeCallableWith({ children: arrayValue });
    expect(Animated.Text).type.not.toBeCallableWith({
      children: ['Value: ', booleanValue],
    });
  });

  test('accepts regular and animated Text props', () => {
    const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.5 }));
    expect(Animated.Text).type.toBeCallableWith({
      numberOfLines: 1,
      style: [{ color: 'red' }, animatedStyle],
      children: stringValue,
    });
  });

  test('rejects unknown props', () => {
    expect(Animated.Text).type.not.toBeCallableWith({ notAProp: true });
  });

  test('accepts CSS callback props', () => {
    const onAnimation = (event: CSSAnimationEvent) => String(event.elapsedTime);
    const onTransition = (event: CSSTransitionEvent) =>
      String(event.elapsedTime);
    expect(Animated.Text).type.toBeCallableWith({
      onCSSAnimationEnd: onAnimation,
      onCSSTransitionStart: onTransition,
      onCSSTransitionEnd: onTransition,
      children: stringValue,
    });
  });

  test('accepts a ref to Text and an animated ref', () => {
    const textRef = createRef<ComponentRef<typeof Text>>();
    const animatedRef = useAnimatedRef<Text>();
    expect(Animated.Text).type.toBeCallableWith({
      ref: textRef,
      children: stringValue,
    });
    expect(Animated.Text).type.toBeCallableWith({
      ref: animatedRef,
      children: stringValue,
    });
  });

  test('resolves its ref to the Text instance', () => {
    expect<ComponentRef<typeof Animated.Text>>().type.toBe<
      ComponentRef<typeof Text>
    >();
  });
});
