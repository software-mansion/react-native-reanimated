'use strict';
import { ReanimatedError } from '../../../../../../common';
import type { CSSTransitionBehavior } from '../../../../../types';
import { ERROR_MESSAGES, normalizeTransitionBehavior } from '../settings';

describe(normalizeTransitionBehavior, () => {
  it('returns true if the behavior is "allowDiscrete"', () => {
    expect(normalizeTransitionBehavior('allow-discrete')).toBe(true);
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
