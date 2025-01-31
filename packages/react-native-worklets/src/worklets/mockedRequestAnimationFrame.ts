'use strict';

// This file should be exclusively used in `react-native-reanimated`, but until we get an actual API in `react-native-worklets` we need to keep it here.

// This is Jest implementation of `requestAnimationFrame` that is required
// by React Native for test purposes.
export function mockedRequestAnimationFrame(
  callback: (timestamp: number) => void
): ReturnType<typeof setTimeout> {
  return setTimeout(() => callback(performance.now()), 0);
}
