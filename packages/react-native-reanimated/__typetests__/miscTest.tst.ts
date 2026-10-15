/* eslint-disable @typescript-eslint/no-empty-function */
import { View } from 'react-native';
import { describe, expect, test } from 'tstyche';

import type {
  CSSAnimationProperties,
  CSSTransitionProperties,
  ScreenTransitionConfig,
} from '..';
import {
  configureReanimatedLogger,
  createAnimatedComponent,
  createAnimatedPropAdapter,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  isSharedValue,
  Keyframe,
  LayoutAnimationConfig,
  makeMutable,
  PerformanceMonitor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withClamp,
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

  test('accepts undefined for an option, which the default fills', () => {
    expect(interpolateColor).type.toBeCallableWith(
      0,
      [0, 1],
      ['red', 'blue'],
      'HSV',
      { gamma: undefined, useCorrectedHSVInterpolation: undefined }
    );
  });
});

describe('interpolate', () => {
  test('accepts undefined for an edge, which extends', () => {
    expect(interpolate).type.toBeCallableWith(0, [0, 1], [0, 1], {
      extrapolateLeft: undefined,
      extrapolateRight: Extrapolation.CLAMP,
    });
    expect(interpolate).type.toBeCallableWith(0, [0, 1], [0, 1], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: undefined,
    });
  });
});

describe('withClamp', () => {
  test('accepts undefined for a bound, which leaves that side open', () => {
    expect(withClamp).type.toBeCallableWith({ min: undefined, max: 1 }, 0);
    expect(withClamp).type.toBeCallableWith({ min: 0, max: undefined }, 0);
  });
});

describe('configureReanimatedLogger', () => {
  test('accepts undefined for a setting, which the default fills', () => {
    expect(configureReanimatedLogger).type.toBeCallableWith({
      level: undefined,
      strict: undefined,
    });
  });
});

describe('optional component props', () => {
  test('accept undefined, as when the prop is not passed', () => {
    expect(LayoutAnimationConfig).type.toBeConstructableWith({
      skipEntering: undefined,
      skipExiting: undefined,
      children: null,
    });
    expect(PerformanceMonitor).type.toBeCallableWith({
      smoothingFrames: undefined,
    });
  });
});

describe('createAnimatedComponent', () => {
  test('accepts undefined for an option, as when it is not passed', () => {
    expect(createAnimatedComponent).type.toBeCallableWith(View, {
      jsProps: undefined,
      setNativeProps: undefined,
    });
  });
});

describe('CSS animation and transition properties', () => {
  test('accept undefined for a setting, as when it is not set', () => {
    expect<{
      animationName: 'none';
      animationDuration: undefined;
      animationTimingFunction: undefined;
      animationDelay: undefined;
      animationIterationCount: undefined;
      animationDirection: undefined;
      animationFillMode: undefined;
      animationPlayState: undefined;
    }>().type.toBeAssignableTo<CSSAnimationProperties>();
    expect<{
      transitionProperty: undefined;
      transitionDuration: undefined;
      transitionTimingFunction: undefined;
      transitionDelay: undefined;
      transitionBehavior: undefined;
      transition: undefined;
    }>().type.toBeAssignableTo<CSSTransitionProperties>();
  });
});

describe('ScreenTransitionConfig', () => {
  test('accepts undefined for onFinishAnimation, as when it is not passed', () => {
    expect<{ onFinishAnimation: undefined }>().type.toBeAssignableTo<
      Pick<ScreenTransitionConfig, 'onFinishAnimation'>
    >();
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
