import { describe, expect, test } from 'tstyche';

import type { AnimationCallback, AnimationObject } from '..';
import { defineAnimation } from '..';

describe('defineAnimation', () => {
  test('accepts an animation that stores an optional callback', () => {
    const callback: AnimationCallback | undefined = undefined;
    expect(defineAnimation<AnimationObject>).type.toBeCallableWith(0, () => ({
      onFrame: () => true,
      onStart: () => undefined,
      callback,
    }));
  });
});
