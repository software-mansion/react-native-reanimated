import { describe, expect, test } from 'tstyche';

import type { AnimationCallback, AnimationObject } from '..';
import { defineAnimation } from '..';

describe('defineAnimation', () => {
  test('a factory stores the optional callback it was given, like withTiming, withSpring and withDecay', () => {
    const withCallback = (callback?: AnimationCallback) =>
      defineAnimation<AnimationObject>(0, () => ({
        onFrame: () => true,
        onStart: () => undefined,
        callback,
      }));

    expect(withCallback).type.toBeCallableWith();
    expect(withCallback).type.toBeCallableWith(
      (finished?: boolean) => finished
    );
  });
});
