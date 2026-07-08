'use strict';
import { createReducedMotionManager } from './ReducedMotionBase';

type localGlobal = typeof global & Record<string, unknown>;

export function isReducedMotionEnabledInSystem() {
  return !!(global as localGlobal)._REANIMATED_IS_REDUCED_MOTION;
}

export const ReducedMotionManager = createReducedMotionManager(
  isReducedMotionEnabledInSystem()
);
