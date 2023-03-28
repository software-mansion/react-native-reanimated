import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { ReanimatedPluginPass } from './types';
import { processWorkletObjectMethod } from './processWorkletObjectMethod';
import { processWorkletFunction } from './processWorkletFunction';

/**
 * holds a map of function names as keys and array of argument indexes as values which should be automatically workletized(they have to be functions)(starting from 0)
 */
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
  t: typeof BabelCore.types,
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  state: ReanimatedPluginPass
) {
  const callee = BabelTypes.isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  let name = '';
  if ('name' in callee) name = callee.name;
  else if ('property' in callee && 'name' in callee.property)
    name = callee.property.name;
  // else name = 'anonymous'; --- might add it in the future [TO DO]

  if (
    objectHooks.has(name) &&
    BabelTypes.isObjectExpression(
      (
        path.get('arguments.0') as BabelCore.NodePath<
          BabelTypes.CallExpression['arguments'][number]
        >
      ).node
    )
  ) {
    const properties = path.get('arguments.0.properties') as Array<
      BabelCore.NodePath<BabelTypes.ObjectMethod | BabelTypes.ObjectProperty>
    >;
    for (const property of properties) {
      if (t.isObjectMethod(property.node)) {
        processWorkletObjectMethod(
          t,
          property as BabelCore.NodePath<BabelTypes.ObjectMethod>,
          state
        );
      } else {
        const value = property.get('value') as BabelCore.NodePath<
          BabelTypes.ObjectProperty['value']
        >;
        processWorkletFunction(
          t,
          value as BabelCore.NodePath<
            | BabelTypes.FunctionDeclaration
            | BabelTypes.FunctionExpression
            | BabelTypes.ArrowFunctionExpression
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
          t,
          path.get(`arguments.${index}`) as BabelCore.NodePath<
            | BabelTypes.FunctionDeclaration
            | BabelTypes.FunctionExpression
            | BabelTypes.ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      });
    }
  }
}
