import { describe, expect, test } from 'tstyche';

import {
  advanceAnimationByFrame,
  advanceAnimationByTime,
  getAnimatedStyle,
  setUpTests,
  withReanimatedTimer,
} from '..';

// Regression coverage for
// https://github.com/software-mansion/react-native-reanimated/issues/11082.
//
// TypeScript consumers don't read `jestUtils/index.native.ts`, so the types
// of `jestUtils/index.ts` (the web stub) have to match it. The web pass of
// `scripts/test-ts.sh` resolves this file without the `.native` suffix.

describe('getAnimatedStyle', () => {
  test('takes a component and returns its style', () => {
    expect(getAnimatedStyle).type.toBeCallableWith({ props: {} });
    expect(getAnimatedStyle).type.not.toBeCallableWith();
    expect(getAnimatedStyle({ props: {} })).type.toHaveProperty('opacity');
  });
});

describe('setUpTests', () => {
  test('accepts an optional framerate config', () => {
    expect(setUpTests).type.toBeCallableWith();
    expect(setUpTests).type.toBeCallableWith({ fps: 30 });
  });
});

describe('withReanimatedTimer', () => {
  test('requires the test callback', () => {
    expect(withReanimatedTimer).type.toBeCallableWith(() => undefined);
    expect(withReanimatedTimer).type.not.toBeCallableWith();
  });
});

describe('advanceAnimationByTime', () => {
  test('accepts an optional time', () => {
    expect(advanceAnimationByTime).type.toBeCallableWith();
    expect(advanceAnimationByTime).type.toBeCallableWith(100);
  });
});

describe('advanceAnimationByFrame', () => {
  test('requires the frame count', () => {
    expect(advanceAnimationByFrame).type.toBeCallableWith(3);
    expect(advanceAnimationByFrame).type.not.toBeCallableWith();
  });
});

describe('jest matchers', () => {
  test('declares `toHaveAnimatedStyle`', () => {
    expect<jest.Matchers<void>['toHaveAnimatedStyle']>().type.toBeCallableWith(
      { opacity: 1 },
      { shouldMatchAllProps: true }
    );
  });

  test('declares `toHaveAnimatedProps`', () => {
    expect<jest.Matchers<void>['toHaveAnimatedProps']>().type.toBeCallableWith({
      text: 'text',
    });
  });
});
