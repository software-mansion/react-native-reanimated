'use strict';
import { IS_WINDOW_AVAILABLE } from './common';
import { createReducedMotionManager } from './ReducedMotionCommon';

const reducedMotionQuery = IS_WINDOW_AVAILABLE
  ? // @ts-ignore Fallback if `window` is undefined.
    window.matchMedia('(prefers-reduced-motion: reduce)')
  : undefined;

export function isReducedMotionEnabledInSystem(): boolean {
  return reducedMotionQuery?.matches ?? false;
}

export const ReducedMotionManager = createReducedMotionManager(
  isReducedMotionEnabledInSystem()
);

// is-tree-shakable-suppress
reducedMotionQuery?.addEventListener(
  'change',
  (event: { readonly matches: boolean }) => {
    ReducedMotionManager.applySystemChange(event.matches);
  }
);
