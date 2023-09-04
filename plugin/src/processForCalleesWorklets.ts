import type { NodePath } from '@babel/core';
import type { CallExpression, ObjectExpression } from '@babel/types';
import { isSequenceExpression } from '@babel/types';
import type { ReanimatedPluginPass } from './types';
import { processWorkletObjectMethod } from './processWorkletObjectMethod';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import { strict as assert } from 'assert';

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
]);

const objectHooks = new Set([
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
]);

export function processForCalleesWorklets(
  path: NodePath<CallExpression>,
  state: ReanimatedPluginPass
) {
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
    const workletToProcess = path.get('arguments.0');
    assert(
      !Array.isArray(workletToProcess),
      '[Reanimated] `workletToProcess` is an array.'
    );
    if (workletToProcess.isObjectExpression()) {
      processObjectHook(workletToProcess, state);
      // useAnimatedScrollHandler can take a function as an argument instead of an ObjectExpression
      // but useAnimatedGestureHandler can't
    } else if (name === 'useAnimatedScrollHandler') {
      processIfWorkletFunction(workletToProcess, state);
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
) {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectMethod()) {
      processWorkletObjectMethod(property, state);
    } else if (property.isObjectProperty()) {
      const value = property.get('value');
      processIfWorkletFunction(value, state);
    } else {
      throw new Error(
        `[Reanimated] '${property.type}' as to-be workletized arguments is not supported for object hooks.`
      );
    }
  }
}

function processArguments(
  path: NodePath<CallExpression>,
  indices: number[],
  state: ReanimatedPluginPass
) {
  const argumentsArray = path.get('arguments');
  indices.forEach((index) => {
    const argumentToWorkletize = argumentsArray[index];
    if (!argumentToWorkletize) {
      // workletizable argument doesn't always have to be specified
      return;
    }
    processIfWorkletFunction(argumentToWorkletize, state);
  });
}
