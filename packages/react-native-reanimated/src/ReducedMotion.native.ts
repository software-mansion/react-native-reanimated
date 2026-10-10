'use strict';
import { AccessibilityInfo } from 'react-native';

import { createReducedMotionManager } from './ReducedMotionCommon';

type localGlobal = typeof global & Record<string, unknown>;

let isReducedMotionEnabled = !!(global as localGlobal)
  ._REANIMATED_IS_REDUCED_MOTION;

export function isReducedMotionEnabledInSystem() {
  return isReducedMotionEnabled;
}

export const ReducedMotionManager = createReducedMotionManager(
  isReducedMotionEnabled
);

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  isReducedMotionEnabled = enabled;
  ReducedMotionManager.applySystemChange(enabled);
});
