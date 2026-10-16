import { describe, expect, test } from 'tstyche';

import type { AnimatedProps } from '..';
import Animated, { useDerivedValue, useSharedValue } from '..';

describe('AnimatedProps', () => {
  test('accepts narrower shared values for optional props', () => {
    type OptionalStringProp = AnimatedProps<{ value?: string }>['value'];

    expect(useSharedValue('')).type.toBeAssignableTo<OptionalStringProp>();
    expect(
      useDerivedValue(() => '')
    ).type.toBeAssignableTo<OptionalStringProp>();
    expect(
      useDerivedValue<string>(() => '')
    ).type.toBeAssignableTo<OptionalStringProp>();
    expect(useSharedValue(0)).type.not.toBeAssignableTo<OptionalStringProp>();
  });

  test('accepts undefined for the layout animation, shared transition and animatedProps props', () => {
    expect(Animated.View).type.toBeCallableWith({
      entering: undefined,
      exiting: undefined,
      layout: undefined,
      sharedTransitionTag: undefined,
      sharedTransitionStyle: undefined,
      animatedProps: undefined,
    });
  });

  test('accepts undefined for the FlatList and ScrollView props', () => {
    expect(Animated.FlatList).type.toBeCallableWith({
      data: [],
      renderItem: () => null,
      itemLayoutAnimation: undefined,
      skipEnteringExitingAnimations: undefined,
      ref: undefined,
    });
    expect(Animated.ScrollView).type.toBeCallableWith({
      scrollViewOffset: undefined,
    });
  });
});
