import { NodePath } from '@babel/core';
import {
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from '@babel/types';
import { isGestureHandlerEventCallback } from './isGestureHandlerEventCallback';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import { isLayoutAnimationCallback } from './isLayoutAnimationCallback';
import { ReanimatedPluginPass } from './types';

export function processIfCallback(
  path: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
) {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    processIfWorkletFunction(path, state);
  }
}
