import { isWeb } from '../PlatformChecker';

export function useReducedMotion() {
  if (isWeb()) {
    return !window.matchMedia('(prefers-reduced-motion: no-preference)')
      .matches;
  }

  return global._REANIMATED_IS_REDUCED_MOTION ?? false;
}
