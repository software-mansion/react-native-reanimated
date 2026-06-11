'use strict';
import type { NativePseudoSelectorKey } from '../types/pseudo';

export const NATIVE_PSEUDO_SELECTORS: ReadonlySet<NativePseudoSelectorKey> =
  new Set([':hover', ':active', ':active-deepest', ':focus', ':focus-within']);
