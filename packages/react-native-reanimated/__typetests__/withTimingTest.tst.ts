/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, test } from 'tstyche';

import { Easing, useAnimatedStyle, useSharedValue, withTiming } from '..';

describe('withTiming', () => {
  test('animates width with a numeric toValue', () => {
    const width = useSharedValue(50);
    expect(useAnimatedStyle).type.toBeCallableWith(() => ({
      width: withTiming(
        width.value,
        { duration: 500, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) },
        (_finished) => {}
      ),
    }));
  });

  test('animates backgroundColor with a color string toValue', () => {
    expect(useAnimatedStyle).type.toBeCallableWith(() => ({
      backgroundColor: withTiming(
        'rgba(255,105,180,0)',
        { duration: 500, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) },
        (_finished) => {}
      ),
    }));
  });
});
