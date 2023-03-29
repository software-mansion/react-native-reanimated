import { NodePath } from '@babel/core';
import {
  CallExpression,
  isSequenceExpression,
  isObjectExpression,
  ObjectMethod,
  ObjectProperty,
  isObjectMethod,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from '@babel/types';
import { ReanimatedPluginPass } from './types';
import { processWorkletObjectMethod } from './processWorkletObjectMethod';
import { processWorkletFunction } from './processWorkletFunction';

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

export function processWorklets(
  path: NodePath<CallExpression>,
  state: ReanimatedPluginPass
) {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  let name = '';
  if ('name' in callee) name = callee.name;
  else if ('property' in callee && 'name' in callee.property)
    name = callee.property.name;
  // else name = 'anonymous'; --- might add it in the future [TO DO]

  if (
    objectHooks.has(name) &&
    isObjectExpression(
      (path.get('arguments.0') as NodePath<CallExpression['arguments'][number]>)
        .node
    )
  ) {
    const properties = path.get('arguments.0.properties') as Array<
      NodePath<ObjectMethod | ObjectProperty>
    >;
    for (const property of properties) {
      if (isObjectMethod(property.node)) {
        processWorkletObjectMethod(property as NodePath<ObjectMethod>, state);
      } else {
        const value = property.get('value') as NodePath<
          ObjectProperty['value']
        >;
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
