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
import { objectHooks, functionArgsToWorkletize } from './commonObjects';
import { processWorkletObjectMethod } from './processWorkletObjectMethod';
import { processIfWorkletFunction } from './processIfWorkletFunction';

function processForCalleesWorklets(
  path: NodePath<CallExpression>,
  state: ReanimatedPluginPass
): void {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  let name;
  if ('name' in callee) name = callee.name;
  else if ('property' in callee && 'name' in callee.property)
    name = callee.property.name;
  else return;

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
