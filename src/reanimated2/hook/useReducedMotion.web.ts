export function useReducedMotion() {
  return !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}
