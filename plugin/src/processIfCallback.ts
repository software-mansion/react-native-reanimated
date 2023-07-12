import type { NodePath } from '@babel/core';
import { isGestureHandlerEventCallback } from './isGestureHandlerEventCallback';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import { isLayoutAnimationCallback } from './isLayoutAnimationCallback';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';

export function processIfCallback(
  path: NodePath<ExplicitWorklet>,
  state: ReanimatedPluginPass
) {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    processIfWorkletFunction(path, state);
  }
}
