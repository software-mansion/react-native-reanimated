'use strict';
/*
 * Stubbed for web, where we don't use this file;
 */

// Consumers' TypeScript doesn't read `index.native.ts`, so the stub borrows its
// signatures (and, through the import, the `jest.Matchers` augmentation) to keep
// the published types the same as what Jest runs.
import type * as JestUtils from './index.native';

export const withReanimatedTimer: typeof JestUtils.withReanimatedTimer = () => {
  // NOOP
};

export const advanceAnimationByTime: typeof JestUtils.advanceAnimationByTime =
  () => {
    // NOOP
  };

export const advanceAnimationByFrame: typeof JestUtils.advanceAnimationByFrame =
  () => {
    // NOOP
  };

export const setUpTests: typeof JestUtils.setUpTests = () => {
  // NOOP
};

export const getAnimatedStyle: typeof JestUtils.getAnimatedStyle = () => {
  // NOOP
  return undefined as never;
};

export { cloneWorklet, worklet } from './common';
