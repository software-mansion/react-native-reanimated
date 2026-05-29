import { describe, expect, test } from 'tstyche';

import { Easing, withTiming } from '..';

describe('withTiming', () => {
  test('animates a numeric toValue to a numeric result', () => {
    expect(
      withTiming(50, {
        duration: 500,
        easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
      })
    ).type.toBeAssignableTo<number>();
  });

  test('animates a color string toValue to a string result', () => {
    expect(
      withTiming('rgba(255,105,180,0)', {
        duration: 500,
        easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
      })
    ).type.toBeAssignableTo<string>();
  });

  test('accepts an animation callback', () => {
    expect(withTiming).type.toBeCallableWith(
      50,
      {},
      (_finished?: boolean) => undefined
    );
  });
});
