export function blockUIThread(durationMs: number) {
  'worklet';
  const end = global._getAnimationTimestamp() + durationMs;
  while (global._getAnimationTimestamp() < end) {
    continue;
  }
}
