'use strict';
import { ReanimatedError } from '../../../../common';
import type { CSSTransitionBehavior } from '../../../types';
import { VALID_TRANSITION_BEHAVIORS } from './constants';

export const ERROR_MESSAGES = {
  invalidTransitionBehavior: (behavior: CSSTransitionBehavior) =>
    `Invalid transition behavior "${behavior}".`,
};

export function normalizeTransitionBehavior(
  behavior: CSSTransitionBehavior = 'normal'
): boolean {
  if (!VALID_TRANSITION_BEHAVIORS.includes(behavior)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidTransitionBehavior(behavior)
    );
  }
  return behavior === 'allow-discrete';
}
