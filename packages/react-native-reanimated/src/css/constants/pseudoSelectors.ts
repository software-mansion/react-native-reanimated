'use strict';
import type { NativePseudoSelectorKey } from '../types/pseudo';

// Priority order - later is more important
export const NATIVE_PSEUDO_SELECTORS_PRIORITY: readonly NativePseudoSelectorKey[] =
  [':focus-within', ':focus', ':hover', ':active', ':active-deepest'];

export const NATIVE_PSEUDO_SELECTORS: ReadonlySet<NativePseudoSelectorKey> =
  new Set(NATIVE_PSEUDO_SELECTORS_PRIORITY);
