import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { isSequenceExpression, isV8IntrinsicIdentifier } from '@babel/types';

import {
  gestureHandlerBuilderMethods,
  isGestureHandlerEventCallback,
  isGestureObjectEventCallbackMethod,
} from './gestureHandlerAutoworkletization';
import { isLayoutAnimationCallback } from './layoutAnimationAutoworkletization';
import { processWorkletizableObject } from './objectWorklets';
import { findReferencedWorklet } from './referencedWorklets';
import type {
  ReanimatedPluginPass,
  WorkletizableFunction,
  WorkletizableObject,
} from './types';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';
import { processWorklet } from './workletSubstitution';

const reanimatedObjectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

const reanimatedFunctionHooks = new Set([
  'useFrameCallback',
  'useAnimatedStyle',
  'useAnimatedProps',
  'createAnimatedPropAdapter',
  'useDerivedValue',
  'useAnimatedScrollHandler',
  'useAnimatedReaction',
  'useWorkletCallback',
  // animations' callbacks
  'withTiming',
  'withSpring',
  'withDecay',
  'withRepeat',
  // scheduling functions
  'runOnUI',
  'executeOnUIRuntimeSync',
  'scheduleOnUI',
]);

// TODO: DRY
const reanimatedFunctionArgsToWorkletize = new Map([
  ['useAnimatedGestureHandler', [0]],
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['useWorkletCallback', [0]],
  ['withTiming', [2]],
  ['withSpring', [2]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
  ['runOnUI', [0]],
  ['executeOnUIRuntimeSync', [0]],
  ['scheduleOnUI', [0]],
  ...Array.from(gestureHandlerBuilderMethods).map((name) => [name, [0]]),
] as [string, number[]][]);

/** @returns `true` if the function was workletized, `false` otherwise. */
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

export function processCalleesAutoworkletizableCallbacks(
  path: NodePath<CallExpression>,
  state: ReanimatedPluginPass
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
  state: ReanimatedPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): void {
  args.forEach((arg) => {
    const maybeWorklet = findWorklet(
      arg,
      acceptWorkletizableFunction,
      acceptObject
    );
    if (!maybeWorklet) {
      return;
    }
    if (isWorkletizableFunctionPath(maybeWorklet)) {
      processWorklet(maybeWorklet, state);
    } else if (isWorkletizableObjectPath(maybeWorklet)) {
      processWorkletizableObject(maybeWorklet, state);
    }
  });
}

function findWorklet(
  arg: NodePath,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  if (acceptWorkletizableFunction && isWorkletizableFunctionPath(arg)) {
    return arg;
  }
  if (acceptObject && isWorkletizableObjectPath(arg)) {
    return arg;
  }
  if (arg.isIdentifier() && arg.isReferencedIdentifier()) {
    return findReferencedWorklet(
      arg,
      acceptWorkletizableFunction,
      acceptObject
    );
  }
  return undefined;
}
