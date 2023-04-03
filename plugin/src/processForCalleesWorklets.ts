import { NodePath } from '@babel/core';
import {
  CallExpression,
  isSequenceExpression,
  ObjectExpression,
  isObjectProperty,
} from '@babel/types';
import { ReanimatedPluginPass } from './types';
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
    assert(!Array.isArray(workletToProcess), "'workletToProcess' is an array'");
    if (workletToProcess.isObjectExpression()) {
      processObjectHook(workletToProcess, state);
    }
  } else {
    processArguments(name, path, state);
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
    } else if (isObjectProperty(property.node)) {
      const value = property.get('value');
      assert(!Array.isArray(value), "'value' is an array'");
      processIfWorkletFunction(value, state);
    } else {
      throw new Error(
        `'${property.type}' as to-be workletized arguments is not supported for object hooks`
      );
    }
  }
}

function processArguments(
  name: string,
  path: NodePath<CallExpression>,
  state: ReanimatedPluginPass
): void {
  const indexes = functionArgsToWorkletize.get(name);
  if (Array.isArray(indexes)) {
    const argumentsArray = path.get('arguments');
    indexes.forEach((index) => {
      const argumentToWorkletize = argumentsArray[index];
      processIfWorkletFunction(argumentToWorkletize, state);
    });
  }
}
