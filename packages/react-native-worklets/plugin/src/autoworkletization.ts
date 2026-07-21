import type { NodePath } from '@babel/core';
import type { BlockStatement, CallExpression } from '@babel/types';
import { isSequenceExpression, isV8IntrinsicIdentifier } from '@babel/types';

import { addDirective, replaceImplicitReturnWithBlock } from './directives';
import { forEachWorkletizableFunction } from './findWorklet';
import {
  gestureHandlerBuilderMethods,
  gestureHandlerObjectHooks,
  isGestureHandlerEventCallback,
  isGestureObjectEventCallbackMethod,
} from './gestureHandlerAutoworkletization';
import { isLayoutAnimationCallback } from './layoutAnimationAutoworkletization';
import type { WorkletizableFunction, WorkletsPluginPass } from './types';

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

export function addDirectivesToKnownCallback(
  path: NodePath<WorkletizableFunction>
): void {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    addDirectives(path);
  }
}

export function handleWorkletizableCallback(
  path: NodePath<CallExpression>,
  state: WorkletsPluginPass
): void {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

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

    addDirectivesToArgs(args, state, acceptWorkletizableFunction, acceptObject);
  } else if (
    !isV8IntrinsicIdentifier(callee) &&
    isGestureObjectEventCallbackMethod(callee)
  ) {
    const args = path.get('arguments');
    addDirectivesToArgs(args, state, true, true);
  }
}

function addDirectivesToArgs(
  args: NodePath[],
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): void {
  args.forEach((arg) => {
    forEachWorkletizableFunction(
      arg,
      state,
      acceptWorkletizableFunction,
      acceptObject,
      addDirectives
    );
  });
}

function addDirectives(path: NodePath<WorkletizableFunction>): void {
  if (path.isArrowFunctionExpression()) {
    replaceImplicitReturnWithBlock(path.node);
  }
  addDirective(path.node.body as BlockStatement, 'worklet');
}
