'use strict';
import type { NativePseudoSelectorKey } from '../types/pseudo';

// Priority order - later is more important
export const NATIVE_PSEUDO_SELECTORS_PRIORITY: readonly NativePseudoSelectorKey[] =
  [':focus-within', ':focus', ':hover', ':active', ':active-deepest'];

export const NATIVE_PSEUDO_SELECTORS: ReadonlySet<NativePseudoSelectorKey> =
  new Set(NATIVE_PSEUDO_SELECTORS_PRIORITY);

export const PRESS_PSEUDO_SELECTORS: readonly NativePseudoSelectorKey[] = [
  ':active',
  ':active-deepest',
];

// UIKit skips views below this alpha when hit-testing, so a fully transparent one never receives
// the touch its press selector is written for. Android and the web deliver it either way.
export const IOS_MIN_HIT_TESTABLE_OPACITY = 0.01;
