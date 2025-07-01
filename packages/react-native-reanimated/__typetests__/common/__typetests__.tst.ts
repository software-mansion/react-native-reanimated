import { useRef } from 'react';
import { describe, expect, test } from 'tstyche';

import Animated, {
  makeMutable,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
} from '../..';

describe('makeMutable', () => {
  test('makeMutable<number> should be callable with number', () => {
    expect(makeMutable<number>).type.toBeCallableWith(0);
  });

  test('makeMutable<number> should not be callable with string', () => {
    expect(makeMutable<number>).type.not.toBeCallableWith('a');
  });
});

describe('withDecay', () => {
  test('withDecay should not be callable with rubberBandEffect: true and no clamp', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: true,
    });
  });

  test('withDecay should be callable with rubberBandEffect: true and clamp', () => {
    expect(withDecay).type.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0, 1],
    });
  });

  test('withDecay should not be callable with rubberBandEffect: true and clamp too short', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0],
    });
  });

  test('withDecay should not be callable with rubberBandEffect: true and clamp too long', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0, 1, 2],
    });
  });

  test('withDecay should not be callable with rubberBandEffect: false and rubberBandFactor', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: false,
      rubberBandFactor: 3,
    });
  });

  test('withDecay should not be callable with rubberBandEffect: false and rubberBandFactor', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: false,
      rubberBandFactor: 3,
    });
  });
});

describe('Animated.FlatList', () => {
  test('FlatList<number> should be callable with number', () => {
    expect(Animated.FlatList<number>).type.toBeCallableWith({
      data: [0, 1],
      renderItem: () => null,
    });
  });

  test('FlatList<string> should be callable with string', () => {
    expect(Animated.FlatList<string>).type.toBeCallableWith({
      data: ['a', 'b'],
      renderItem: () => null,
    });
  });

  test('FlatList<number> shouldn not be callable with string', () => {
    expect(Animated.FlatList<number>).type.not.toBeCallableWith({
      data: ['a', 'b'],
      renderItem: () => null,
    });
  });
});

describe('withSpring', () => {
  test('withSpring should be callable with string', () => {
    expect(Animated.View).type.toBeConstructableWith({
      style: useAnimatedStyle(() => {
        return {
          backgroundColor: withSpring(
            'rgba(255,105,180,0)',
            {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {}
          ),
        };
      }),
    });
  });
});

describe('useDerivedValue', () => {
  test('should not be able to set value', () => {
    const progress = useSharedValue(0);
    const width = useDerivedValue(() => {
      return progress.value * 250;
    });
    expect(() => (width.value = 10)).type.toRaiseError();
  });
});

describe('nativeMethods', () => {
  test('measure', () => {
    const animatedRef = useAnimatedRef<Animated.View>();
    expect(measure).type.toBeCallableWith(animatedRef);

    const plainRef = useRef<Animated.View>(null);
    expect(measure).type.not.toBeCallableWith(plainRef);
  });
});
