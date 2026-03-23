'use strict';
import { useEffect } from 'react';

import type { SharedValue } from '../commonTypes';
import { useFrameCallback } from './useFrameCallback';
import { useSharedValue } from './useSharedValue';

/**
 * Lets you access the current frame timestamp as a shared value.
 *
 * @param isActive - Whether the timestamp should update. Defaults to `true`.
 * @returns A shared value that updates every frame with the time elapsed since
 *   the first frame.
 */
export function useTimestamp(isActive = true): SharedValue<number> {
  const timestamp = useSharedValue(0);
  const frameCallback = useFrameCallback((info) => {
    'worklet';
    timestamp.value = info.timeSinceFirstFrame;
  }, isActive);

  useEffect(() => {
    frameCallback.setActive(isActive);
  }, [isActive, frameCallback]);

  return timestamp;
}
