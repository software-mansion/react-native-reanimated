export function useReducedMotion() {
  return global._REANIMATED_IS_REDUCED_MOTION ?? false;
}
