/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, test } from 'tstyche';

import {
  createAnimatedPropAdapter,
  Easing,
  interpolateColor,
  isSharedValue,
  Keyframe,
  makeMutable,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from '..';

describe('makeMutable', () => {
  test('is callable with the initial value', () => {
    expect(makeMutable).type.toBeCallableWith(0);
    expect(makeMutable).type.toBeCallableWith(true);
  });
});

describe('isSharedValue', () => {
  test('is callable with any value', () => {
    const sv = useSharedValue(0);
    expect(isSharedValue).type.toBeCallableWith(null);
    expect(isSharedValue).type.toBeCallableWith(undefined);
    expect(isSharedValue).type.toBeCallableWith(42);
    expect(isSharedValue).type.toBeCallableWith('foo');
    expect(isSharedValue).type.toBeCallableWith({ foo: 'bar' });
    expect(isSharedValue).type.toBeCallableWith(sv);
  });
});

describe('interpolateColor', () => {
  test('accepts numeric and string color ranges and an optional color space', () => {
    const sv = useSharedValue(0);
    expect(interpolateColor).type.toBeCallableWith(
      sv.value,
      [0, 1],
      [0x00ff00, 0x0000ff]
    );
    expect(interpolateColor).type.toBeCallableWith(
      sv.value,
      [0, 1],
      ['red', 'blue']
    );
    expect(interpolateColor).type.toBeCallableWith(
      sv.value,
      [0, 1],
      ['#00FF00', '#0000FF'],
      'RGB'
    );
    expect(interpolateColor).type.toBeCallableWith(
      sv.value,
      [0, 1],
      ['#FF0000', '#00FF99'],
      'HSV'
    );
  });
});

describe('animated prop adapters', () => {
  test('adapters work with useAnimatedProps but not useAnimatedStyle', () => {
    const adapter1 = createAnimatedPropAdapter((_props) => {}, []);
    const adapter2 = createAnimatedPropAdapter(
      (_props) => {},
      ['prop1', 'prop2']
    );
    const adapter3 = createAnimatedPropAdapter(() => {});

    expect(useAnimatedProps).type.toBeCallableWith(() => ({}), null, adapter1);
    expect(useAnimatedProps).type.toBeCallableWith(() => ({}), null, [
      adapter2,
      adapter3,
    ]);
    expect(useAnimatedStyle).type.not.toBeCallableWith(() => ({}), undefined, [
      adapter1,
      adapter2,
      adapter3,
    ]);
  });
});

describe('Easing and Keyframe', () => {
  test('Easing.bezier is callable', () => {
    expect(Easing.bezier).type.toBeCallableWith(0.1, 0.7, 1, 0.1);
  });

  test('Keyframe is constructable with from/to', () => {
    const easing = Easing.bezier(0.1, 0.7, 1, 0.1);
    expect(Keyframe).type.toBeConstructableWith({
      from: { opacity: 0 },
      to: { opacity: 1, easing },
    });
  });
});
