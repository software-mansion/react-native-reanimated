'use strict';
import type { PseudoGroup } from '../types';

let nextPseudoGroup = 1;

/** Creates a group for one view to host through `setPseudoStyles`. */
export function createPseudoGroup(): PseudoGroup {
  return nextPseudoGroup++ as PseudoGroup;
}
