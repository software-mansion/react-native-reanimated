import { NodePath, PluginPass } from '@babel/core';
import {
  CallExpression,
  isSequenceExpression,
  isObjectExpression,
  Expression,
  isMemberExpression,
  ObjectMethod,
  ObjectProperty,
  isObjectMethod,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from '@babel/types';
import { functionArgsToWorkletize, objectHooks } from './commonObjects';
import { processWorkletFunction } from './processWorkletFunction';
import { processWorkletObjectMethod } from './processWorkletObjectMethod';

export function processWorklets(
  path: NodePath<CallExpression>,
  state: PluginPass
) {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  const name = isMemberExpression(callee) // @ts-expect-error [TO DO]
    ? callee.property.name // @ts-expect-error [TO DO]
    : callee.name;

  if (
    objectHooks.has(name) &&
    isObjectExpression((path.get('arguments.0') as NodePath<Expression>).node)
  ) {
    const properties = path.get('arguments.0.properties') as Array<
      NodePath<ObjectMethod | ObjectProperty>
    >;
    for (const property of properties) {
      if (isObjectMethod(property.node)) {
        processWorkletObjectMethod(property as NodePath<ObjectMethod>, state);
      } else {
        const value = property.get('value') as NodePath<Expression>;
        processWorkletFunction(
          value as NodePath<
            FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      }
    }
  } else {
    const indexes = functionArgsToWorkletize.get(name);
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        processWorkletFunction(
          path.get(`arguments.${index}`) as NodePath<
            FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      });
    }
  }
}
