import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { isSequenceExpression } from '@babel/types';

import { isGestureHandlerEventCallback } from './gestureHandlerAutoworkletization';
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

const objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

const functionHooks = new Set([
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
]);

const functionArgsToWorkletize = new Map([
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
]);

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

  if (functionHooks.has(name) || objectHooks.has(name)) {
    const acceptWorkletizableFunction = functionHooks.has(name);
    const acceptObject = objectHooks.has(name);
    const argIndices = functionArgsToWorkletize.get(name)!;
    const args = path
      .get('arguments')
      .filter((_, index) => argIndices.includes(index));

    processArgs(args, state, acceptWorkletizableFunction, acceptObject);
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
  if (arg.isReferencedIdentifier() && arg.isIdentifier()) {
    return findReferencedWorklet(
      arg,
      acceptWorkletizableFunction,
      acceptObject
    );
  }
  return undefined;
}
