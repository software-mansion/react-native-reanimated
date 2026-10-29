import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import {
  isIdentifier,
  isSequenceExpression,
  isStringLiteral,
  isV8IntrinsicIdentifier,
} from '@babel/types';

import { addWorkletDirectivesToPath } from './directives';
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
  'runOnRuntimeAsyncWithId',
  'scheduleOnRuntimeWithId',
  // runtime creation
  'createWorkletRuntime',
]);

const reanimatedFunctionArgsToWorkletize = new Map([
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['withTiming', [2, 3]],
  ['withSpring', [2, 3]],
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
  ['runOnRuntimeAsyncWithId', [1]],
  ['scheduleOnRuntimeWithId', [1]],
  ['createWorkletRuntime', [1]],
  ...Array.from(gestureHandlerObjectHooks).map((name) => [name, [0]]),
  ...Array.from(gestureHandlerBuilderMethods).map((name) => [name, [0]]),
] as [string, number[]][]);

const configPropertiesToWorkletize = new Map<
  string,
  { argIndex: number; keys: string[] | null }
>([
  ['createWorkletRuntime', { argIndex: 0, keys: ['initializer'] }],
  [
    'createShareable',
    { argIndex: 2, keys: ['hostDecorator', 'guestDecorator'] },
  ],
  [
    'registerCustomSerializable',
    { argIndex: 0, keys: ['determine', 'pack', 'unpack'] },
  ],
  ['withTiming', { argIndex: 1, keys: ['easing'] }],
  ['useHandler', { argIndex: 0, keys: null }],
]);

export function addDirectivesToKnownCallback(
  path: NodePath<WorkletizableFunction>
): void {
  if (isGestureHandlerEventCallback(path) || isLayoutAnimationCallback(path)) {
    addWorkletDirectivesToPath(path);
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

  const configProperties = configPropertiesToWorkletize.get(name);
  if (configProperties) {
    addDirectivesToConfigProperties(
      path.get('arguments')[configProperties.argIndex],
      configProperties.keys,
      state
    );
  }
}

function addDirectivesToConfigProperties(
  config: NodePath | undefined,
  keys: string[] | null,
  state: WorkletsPluginPass
): void {
  if (!config?.isObjectExpression()) {
    return;
  }
  for (const property of config.get('properties')) {
    if (
      !(property.isObjectMethod() || property.isObjectProperty()) ||
      property.node.computed
    ) {
      continue;
    }
    const key = property.node.key;
    const keyName = isIdentifier(key)
      ? key.name
      : isStringLiteral(key)
        ? key.value
        : undefined;
    if (keyName === undefined || (keys && !keys.includes(keyName))) {
      continue;
    }
    if (property.isObjectMethod()) {
      if (property.node.kind === 'method') {
        addWorkletDirectivesToPath(property);
      }
    } else if (property.isObjectProperty()) {
      forEachWorkletizableFunction(
        property.get('value'),
        state,
        true,
        false,
        addWorkletDirectivesToPath
      );
    }
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
      addWorkletDirectivesToPath
    );
  });
}
