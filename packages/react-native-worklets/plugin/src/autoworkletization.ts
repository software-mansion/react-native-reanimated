import type { NodePath } from '@babel/core';
import type { BlockStatement, CallExpression } from '@babel/types';
import { isSequenceExpression, isV8IntrinsicIdentifier } from '@babel/types';

import { appendWorkletDirective, replaceImplicitReturnWithBlock } from './file';
import { findWorklet } from './findWorklet';
import {
  gestureHandlerBuilderMethods,
  gestureHandlerObjectHooks,
  isGestureHandlerEventCallback,
  isGestureObjectEventCallbackMethod,
} from './gestureHandlerAutoworkletization';
import { isLayoutAnimationCallback } from './layoutAnimationAutoworkletization';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
  type WorkletizableFunction,
  type WorkletizableObject,
  type WorkletsPluginPass,
} from './types';

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
  'runOnRuntimeSync',
  'runOnRuntimeAsync',
  'scheduleOnRuntime',
  'runOnRuntimeSyncWithId',
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
  ['runOnRuntimeSync', [1]],
  ['runOnRuntimeAsync', [1]],
  ['scheduleOnRuntime', [1]],
  ['runOnRuntimeSyncWithId', [1]],
  ['scheduleOnRuntimeWithId', [1]],
  ...Array.from(gestureHandlerObjectHooks).map((name) => [name, [0]]),
  ...Array.from(gestureHandlerBuilderMethods).map((name) => [name, [0]]),
] as [string, number[]][]);

export function addWorkletDirectiveToKnownCallback(
  path: NodePath<WorkletizableFunction>
): void {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    addWorkletDirective(path);
  }
}

export function addWorkletDirectivesToCallbacks(
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

    addWorkletDirectiveToArgs(
      args,
      state,
      acceptWorkletizableFunction,
      acceptObject
    );
  } else if (
    !isV8IntrinsicIdentifier(callee) &&
    isGestureObjectEventCallbackMethod(callee)
  ) {
    const args = path.get('arguments');
    addWorkletDirectiveToArgs(args, state, true, true);
  }
}

function addWorkletDirectiveToArgs(
  args: NodePath[],
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): void {
  args.forEach((arg) => {
    addWorkletDirectiveToNode(
      arg,
      state,
      acceptWorkletizableFunction,
      acceptObject
    );
  });
}

function addWorkletDirectiveToNode(
  arg: NodePath,
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): void {
  const maybeWorklet = findWorklet(
    arg,
    state,
    acceptWorkletizableFunction,
    acceptObject
  );
  if (!maybeWorklet) {
    return;
  }
  if (isWorkletizableFunctionPath(maybeWorklet)) {
    addWorkletDirective(maybeWorklet);
  } else if (isWorkletizableObjectPath(maybeWorklet)) {
    addWorkletDirectiveToMethods(maybeWorklet, state);
  }
}

function addWorkletDirectiveToMethods(
  path: NodePath<WorkletizableObject>,
  state: WorkletsPluginPass
): void {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectMethod()) {
      addWorkletDirective(property);
    } else if (property.isObjectProperty()) {
      const value = property.get('value');
      addWorkletDirectiveToNode(
        value,
        state,
        true, // acceptWorkletizableFunction
        false // acceptObject
      );
    } else {
      throw new Error(
        `[Reanimated] '${property.type}' as to-be workletized argument is not supported for object hooks.`
      );
    }
  }
}

function addWorkletDirective(path: NodePath<WorkletizableFunction>): void {
  if (path.isArrowFunctionExpression()) {
    replaceImplicitReturnWithBlock(path.node);
  }
  appendWorkletDirective(path.node.body as BlockStatement);
}
