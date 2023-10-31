'use strict';

// This is Jest implementation of `requestAnimationFrame` that is required
// by React Native for test purposes.
export function mockedRequestAnimationFrame(
  callback: (timestamp: number) => void
): ReturnType<typeof setTimeout> {
  return setTimeout(() => callback(performance.now()), 0);
}
