'use strict';
import type {
  CSSTransitionProperty,
  NormalizedTransitionProperty,
} from '../../types';

export function normalizeTransitionProperty(
  transitionProperty: CSSTransitionProperty
): NormalizedTransitionProperty {
  if (Array.isArray(transitionProperty) || transitionProperty === 'all') {
    return transitionProperty;
  }
  if (transitionProperty === 'none') {
    return [];
  }
  return [transitionProperty];
}
