'use strict';

/**
 * This is Jest implementation of `requestAnimationFrame` that is required by
 * React Native for test purposes.
 */
export function mockedRequestAnimationFrame(callback) {
  return setTimeout(() => callback(performance.now()), 0);
}
//# sourceMappingURL=mockedRequestAnimationFrame.js.map