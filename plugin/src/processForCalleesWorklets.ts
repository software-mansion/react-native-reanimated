import type { NodePath } from '@babel/core';
import type { CallExpression, ObjectExpression } from '@babel/types';
import { isSequenceExpression } from '@babel/types';
import { isWorkletizableFunctionType } from './types';
import type { ReanimatedPluginPass } from './types';
import { strict as assert } from 'assert';
import { processWorklet } from './processIfWorkletNode';

const functionArgsToWorkletize = new Map([
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['useWorkletCallback', [0]],
  // animations' callbacks
  ['withTiming', [2]],
  ['withSpring', [2]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
  // scheduling functions
  ['runOnUI', [0]],
  ['executeOnUIRuntimeSync', [0]],
]);

const objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

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

  if (objectHooks.has(name)) {
    const maybeWorklet = path.get('arguments.0');
    assert(
      !Array.isArray(maybeWorklet),
      '[Reanimated] `workletToProcess` is an array.'
    );
    if (maybeWorklet.isObjectExpression()) {
      processObjectHook(maybeWorklet, state);
      // useAnimatedScrollHandler can take a function as an argument instead of an ObjectExpression
      // but useAnimatedGestureHandler can't
    } else if (name === 'useAnimatedScrollHandler') {
      if (isWorkletizableFunctionType(maybeWorklet)) {
        processWorklet(maybeWorklet, state);
      }
    }
  } else {
    const indices = functionArgsToWorkletize.get(name);
    if (indices === undefined) {
      return;
    }
    processArguments(path, indices, state);
  }
}

function processObjectHook(
  path: NodePath<ObjectExpression>,
  state: ReanimatedPluginPass
): void {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectMethod()) {
      processWorklet(property, state);
    } else if (property.isObjectProperty()) {
      const value = property.get('value');
      if (isWorkletizableFunctionType(value)) {
        processWorklet(value, state);
      }
    } else {
      throw new Error(
        `[Reanimated] '${property.type}' as to-be workletized argument is not supported for object hooks.`
      );
    }
  }
}

function processArguments(
  path: NodePath<CallExpression>,
  indices: number[],
  state: ReanimatedPluginPass
): void {
  const argumentsArray = path.get('arguments');
  indices.forEach((index) => {
    const maybeWorklet = argumentsArray[index];
    if (!maybeWorklet) {
      // workletizable argument doesn't always have to be specified
      return;
    }
    if (isWorkletizableFunctionType(maybeWorklet)) {
      processWorklet(maybeWorklet, state);
    }
  });
}
