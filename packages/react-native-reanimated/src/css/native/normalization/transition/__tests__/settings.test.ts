'use strict';
import type { CSSTransitionBehavior } from '../../../../types';
import { ERROR_MESSAGES, normalizeTransitionBehavior } from '../settings';

describe(normalizeTransitionBehavior, () => {
  test('returns true if the behavior is "allowDiscrete"', () => {
    expect(normalizeTransitionBehavior('allow-discrete')).toBe(true);
  });

  test('returns false if the behavior is not "allowDiscrete"', () => {
    expect(normalizeTransitionBehavior('normal')).toBe(false);
  });

  test('throws an error if the behavior is invalid', () => {
    const invalidBehavior = 'invalid' as CSSTransitionBehavior;
    expect(() => normalizeTransitionBehavior(invalidBehavior)).toThrow(
      new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidTransitionBehavior(invalidBehavior)}`
      )
    );
  });
});
