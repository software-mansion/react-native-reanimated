/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, test } from 'tstyche';

import { useAnimatedStyle, withSpring } from '..';

describe('withSpring', () => {
  test('animates backgroundColor with a color string toValue', () => {
    expect(useAnimatedStyle).type.toBeCallableWith(() => ({
      backgroundColor: withSpring('rgba(255,105,180,0)', {}, (_finished) => {}),
    }));
  });

  test('accepts undefined for an optional config value, which the default fills', () => {
    const velocity: number | undefined = undefined;
    const dampingRatio: number | undefined = undefined;
    expect(withSpring).type.toBeCallableWith(0, { velocity, stiffness: 1000 });
    expect(withSpring).type.toBeCallableWith(0, {
      duration: 300,
      dampingRatio,
    });
    expect(withSpring).type.toBeCallableWith(0, {
      duration: 300,
      clamp: { min: undefined, max: 1 },
    });
    expect(withSpring).type.toBeCallableWith(0, {
      duration: 300,
      clamp: { min: 0, max: undefined },
    });
  });

  test('accepts undefined for a key of the other mode, which leaves the mode unchanged', () => {
    expect(withSpring).type.toBeCallableWith(0, {
      stiffness: 100,
      duration: undefined,
      dampingRatio: undefined,
      clamp: undefined,
    });
    expect(withSpring).type.toBeCallableWith(0, {
      duration: 300,
      stiffness: undefined,
      damping: undefined,
    });
  });

  test('rejects keys of both modes', () => {
    expect(withSpring).type.not.toBeCallableWith(0, {
      stiffness: 100,
      duration: 300,
    });
  });
});
