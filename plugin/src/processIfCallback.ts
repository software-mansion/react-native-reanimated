import type { NodePath } from '@babel/core';
import { isGestureHandlerEventCallback } from './isGestureHandlerEventCallback';
import { isLayoutAnimationCallback } from './isLayoutAnimationCallback';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { processWorklet } from './processIfWorkletNode';

/**
 *
 * @returns `true` if the function was workletized, `false` otherwise.
 */
export function processIfAutoworkletizableCallback(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): boolean {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    processWorklet(path, state);
    return true;
  }
  return false;
}
