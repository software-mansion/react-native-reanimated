'use strict';
import { isReducedMotion } from '../PlatformChecker';
import { makeMutable } from '../core';

const isReducedMotionEnabled = isReducedMotion();
export const IsReduceMotion = {
  jsValue: isReducedMotionEnabled,
  uiValue: makeMutable(isReducedMotionEnabled),
  setEnabled(value: boolean) {
    IsReduceMotion.jsValue = value;
    IsReduceMotion.uiValue.value = value;
  }
};
/**
 * Lets you query the reduced motion system setting.
 *
 * Changing the reduced motion system setting doesn't cause your components to rerender.
 *
 * @returns A boolean indicating whether the reduced motion setting was enabled when the app started.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion
 */
export function useReducedMotion() {
  return IsReduceMotion.jsValue;
}
