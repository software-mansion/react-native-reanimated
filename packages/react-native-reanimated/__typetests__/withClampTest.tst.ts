import { describe, expect, test } from 'tstyche';

import { ReduceMotion, useAnimatedStyle, withClamp, withSpring } from '..';

describe('withClamp', () => {
  test('requires both a config and an animation to clamp', () => {
    expect(withClamp).type.not.toBeCallableWith();
    expect(withClamp).type.not.toBeCallableWith({ min: 0, max: 100 });
    expect(withClamp).type.toBeCallableWith(
      { min: 0, max: 100 },
      withSpring(50)
    );
  });

  test('min and max are both optional', () => {
    expect(withClamp).type.toBeCallableWith({}, withSpring(50));
    expect(withClamp).type.toBeCallableWith({ min: 0 }, withSpring(50));
    expect(withClamp).type.toBeCallableWith({ max: 100 }, withSpring(50));
  });

  test('accepts reduceMotion, like every other animation modifier', () => {
    expect(withClamp).type.toBeCallableWith(
      { min: 0, max: 100, reduceMotion: ReduceMotion.Never },
      withSpring(50)
    );
    expect(withClamp).type.toBeCallableWith(
      { min: 0, max: 100, reduceMotion: ReduceMotion.Always },
      withSpring(50)
    );
    expect(withClamp).type.toBeCallableWith(
      { min: 0, max: 100, reduceMotion: ReduceMotion.System },
      withSpring(50)
    );
    expect(withClamp).type.toBeCallableWith(
      { reduceMotion: ReduceMotion.Never },
      withSpring(50)
    );
  });

  test('rejects a reduceMotion that is not a ReduceMotion member', () => {
    expect(withClamp).type.not.toBeCallableWith(
      { min: 0, max: 100, reduceMotion: 'never' },
      withSpring(50)
    );
    expect(withClamp).type.not.toBeCallableWith(
      { min: 0, max: 100, reduceMotion: true },
      withSpring(50)
    );
  });

  test('rejects unknown config properties', () => {
    expect(withClamp).type.not.toBeCallableWith(
      { min: 0, max: 100, duration: 500 },
      withSpring(50)
    );
  });

  test('clamps a string animation', () => {
    expect(withClamp).type.toBeCallableWith(
      { min: '0deg', max: '90deg', reduceMotion: ReduceMotion.Never },
      withSpring('45deg')
    );
  });

  test('min and max must match the clamped animation', () => {
    expect(withClamp).type.not.toBeCallableWith(
      { min: '0deg', max: '90deg' },
      withSpring(50)
    );
  });

  test('clamps width inside useAnimatedStyle', () => {
    expect(useAnimatedStyle).type.toBeCallableWith(() => ({
      width: withClamp(
        { min: 0, max: 100, reduceMotion: ReduceMotion.Never },
        withSpring(50)
      ),
    }));
  });
});
