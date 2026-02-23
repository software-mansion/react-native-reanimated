import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { isSequenceExpression, isV8IntrinsicIdentifier } from '@babel/types';

import {
  gestureHandlerBuilderMethods,
  gestureHandlerObjectHooks,
  isGestureHandlerEventCallback,
  isGestureObjectEventCallbackMethod,
} from './gestureHandlerAutoworkletization';
import { isLayoutAnimationCallback } from './layoutAnimationAutoworkletization';
import { tryProcessingNode } from './objectWorklets';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';
import { processWorklet } from './workletSubstitution';

const reanimatedObjectHooks = new Set([
  'useAnimatedScrollHandler',
  ...Array.from(gestureHandlerObjectHooks),
]);

const reanimatedFunctionHooks = new Set([
  'useFrameCallback',
  'useAnimatedStyle',
  'useAnimatedProps',
  'createAnimatedPropAdapter',
  'useDerivedValue',
  'useAnimatedScrollHandler',
  'useAnimatedReaction',
  // animations' callbacks
  'withTiming',
  'withSpring',
  'withDecay',
  'withRepeat',
  // scheduling functions
  'runOnUI',
  'executeOnUIRuntimeSync',
  'scheduleOnUI',
  'runOnUISync',
  'runOnUIAsync',
  'runOnRuntime',
  'runOnRuntimeAsync',
  'runOnRuntimeSync',
  'runOnRuntimeSyncWithId',
  'scheduleOnRuntime',
  'scheduleOnRuntimeWithId',
]);

const reanimatedFunctionArgsToWorkletize = new Map([
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['withTiming', [2]],
  ['withSpring', [2]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
  ['runOnUI', [0]],
  ['executeOnUIRuntimeSync', [0]],
  ['scheduleOnUI', [0]],
  ['runOnUISync', [0]],
  ['runOnUIAsync', [0]],
  ['runOnRuntime', [1]],
  ['runOnRuntimeAsync', [1]],
  ['runOnRuntimeSync', [1]],
  ['runOnRuntimeSyncWithId', [1]],
  ['scheduleOnRuntime', [1]],
  ['scheduleOnRuntimeWithId', [1]],
  ...Array.from(gestureHandlerObjectHooks).map((name) => [name, [0]]),
  ...Array.from(gestureHandlerBuilderMethods).map((name) => [name, [0]]),
] as [string, number[]][]);

/** @returns `true` if the function was workletized, `false` otherwise. */
export function processIfAutoworkletizableCallback(
  path: NodePath<WorkletizableFunction>,
  state: WorkletsPluginPass
): boolean {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    processWorklet(path, state);
    return true;
  }
  return false;
}

export function processCalleesAutoworkletizableCallbacks(
  path: NodePath<CallExpression>,
  state: WorkletsPluginPass
): void {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  // We are looking for objects we know we should workletize
  // hence if object is not named, we return.
  const name =
    'name' in callee
      ? callee.name
      : 'property' in callee && 'name' in callee.property
        ? callee.property.name
        : undefined;
  if (name === undefined) {
    return;
  }

  if (reanimatedFunctionHooks.has(name) || reanimatedObjectHooks.has(name)) {
    const acceptWorkletizableFunction = reanimatedFunctionHooks.has(name);
    const acceptObject = reanimatedObjectHooks.has(name);
    const argIndices = reanimatedFunctionArgsToWorkletize.get(name)!;
    const args = path
      .get('arguments')
      .filter((_, index) => argIndices.includes(index));

    processArgs(args, state, acceptWorkletizableFunction, acceptObject);
  } else if (
    !isV8IntrinsicIdentifier(callee) &&
    isGestureObjectEventCallbackMethod(callee)
  ) {
    const args = path.get('arguments');
    processArgs(args, state, true, true);
  }
}

function processArgs(
  args: NodePath[],
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): void {
  args.forEach((arg) => {
    tryProcessingNode(arg, state, acceptWorkletizableFunction, acceptObject);
  });
}
