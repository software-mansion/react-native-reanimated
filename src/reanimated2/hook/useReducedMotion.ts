'use strict';
import { isReducedMotion } from '../PlatformChecker';

const IS_REDUCED_MOTION = isReducedMotion();

export function useReducedMotion() {
  return IS_REDUCED_MOTION;
}
