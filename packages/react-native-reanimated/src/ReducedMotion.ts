'use strict';
import { makeMutable } from './mutables';
import { isWeb, isWindowAvailable } from './PlatformChecker';

type localGlobal = typeof global & Record<string, unknown>;

export function isReducedMotionEnabledInSystem() {
  return isWeb()
    ? isWindowAvailable()
      ? // @ts-ignore Fallback if `window` is undefined.
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
    : !!(global as localGlobal)._REANIMATED_IS_REDUCED_MOTION;
}

const IS_REDUCED_MOTION_ENABLED_IN_SYSTEM = isReducedMotionEnabledInSystem();

export const ReducedMotionManager = {
  jsValue: IS_REDUCED_MOTION_ENABLED_IN_SYSTEM,
  uiValue: makeMutable(IS_REDUCED_MOTION_ENABLED_IN_SYSTEM),
  setEnabled(value: boolean) {
    ReducedMotionManager.jsValue = value;
    ReducedMotionManager.uiValue.value = value;
  },
};
