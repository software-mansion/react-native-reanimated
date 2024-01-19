import type { NodePath } from '@babel/core';
import { isGestureHandlerEventCallback } from './isGestureHandlerEventCallback';
import { isLayoutAnimationCallback } from './isLayoutAnimationCallback';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { processWorklet } from './processIfWorkletNode';

export function processIfAutoworkletizableCallback(
  path: NodePath<WorkletizableFunction>,
  state: ReanimatedPluginPass
): void {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    processWorklet(path, state);
  }
}
