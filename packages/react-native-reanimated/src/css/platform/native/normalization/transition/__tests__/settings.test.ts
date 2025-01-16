'use strict';
import { normalizeTransitionBehavior, ERROR_MESSAGES } from '../settings';
import { ReanimatedError } from '../../../../../errors';
import type { CSSTransitionBehavior } from '../../../../../types';

describe(normalizeTransitionBehavior, () => {
  it('returns true if the behavior is "allowDiscrete"', () => {
    expect(normalizeTransitionBehavior('allowDiscrete')).toBe(true);
  });

  it('returns false if the behavior is not "allowDiscrete"', () => {
    expect(normalizeTransitionBehavior('normal')).toBe(false);
  });

  it('throws an error if the behavior is invalid', () => {
    const invalidBehavior = 'invalid' as CSSTransitionBehavior;
    expect(() => normalizeTransitionBehavior(invalidBehavior)).toThrow(
      new ReanimatedError(
        ERROR_MESSAGES.invalidTransitionBehavior(invalidBehavior)
      )
    );
  });
});
