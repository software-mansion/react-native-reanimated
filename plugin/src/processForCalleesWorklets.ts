import { NodePath } from '@babel/core';
import {
  CallExpression,
  isSequenceExpression,
  isObjectExpression,
  ObjectMethod,
  ObjectProperty,
  isObjectMethod,
  ObjectExpression,
  isObjectProperty,
} from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { functionArgsToWorkletize, objectHooks } from './commonObjects';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import { processWorkletObjectMethod } from './processWorkletObjectMethod';

// If a call expressions is an ObjectHook we transpile it's arguments
// or if its arguments are explicitly worklets (or they should be workletized)
function processForCalleesWorklets(
  path: NodePath<CallExpression>,
  state: ReanimatedPluginPass
): void {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  const name =
    'name' in callee
      ? callee.name
      : 'property' in callee && 'name' in callee.property
      ? callee.property.name
      : 'unsupported';

  if (objectHooks.has(name)) {
    const workletToProcess = path.get('arguments.0') as NodePath<
      CallExpression['arguments'][number]
    >;
    if (isObjectExpression(workletToProcess))
      processObjectHookArgument(
        workletToProcess as NodePath<ObjectExpression>,
        state
      );
  } else processArguments(name, path, state);
}

function processObjectHookArgument(
  path: NodePath<ObjectExpression>,
  state: ReanimatedPluginPass
): void {
  const properties = path.get('properties') as Array<
    NodePath<ObjectExpression['properties'][number]>
  >;
  for (const property of properties) {
    if (isObjectMethod(property)) {
      processWorkletObjectMethod(property as NodePath<ObjectMethod>, state);
    } else if (isObjectProperty(property)) {
      const value = property.get('value') as NodePath<ObjectProperty['value']>;
      processIfWorkletFunction(value, state);
    } else {
      throw new Error(
        '[Reanimated] Spread syntax (Babel SpreadElement type) as to-be workletized arguments is not supported for object hooks!\n'
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
    const argumentsArray = path.get('arguments') as Array<
      NodePath<CallExpression['arguments'][number]>
    >;
    indexes.forEach((index) => {
      const argumentToWorkletize = argumentsArray[index];
      processIfWorkletFunction(argumentToWorkletize, state);
    });
  }
}

export { processForCalleesWorklets };
