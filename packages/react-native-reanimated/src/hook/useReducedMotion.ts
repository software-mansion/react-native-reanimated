'use strict';
import { isReducedMotionEnabledInSystem } from '../ReducedMotion';

const IS_REDUCED_MOTION_ENABLED_IN_SYSTEM = isReducedMotionEnabledInSystem();

/**
 * Lets you query the reduced motion system setting.
 *
 * Changing the reduced motion system setting doesn't cause your components to
 * rerender.
 *
 * @returns A boolean indicating whether the reduced motion setting was enabled
 *   when the app started.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion
 */
export function useReducedMotion() {
  return IS_REDUCED_MOTION_ENABLED_IN_SYSTEM;
}
