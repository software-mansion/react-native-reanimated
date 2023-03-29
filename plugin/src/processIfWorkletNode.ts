import { NodePath } from '@babel/core';
import {
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  isBlockStatement,
  isDirectiveLiteral,
} from '@babel/types';
import { ReanimatedPluginPass } from './types';
import { processWorkletFunction } from './processWorkletFunction';

export function processIfWorkletNode(
  fun: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
) {
  fun.traverse({
    DirectiveLiteral(path) {
      const value = path.node.value;
      if (
        value === 'worklet' &&
        path.getFunctionParent() === fun &&
        isBlockStatement(fun.node.body)
      ) {
        // make sure "worklet" is listed among directives for the fun
        // this is necessary as because of some bug, babel will attempt to
        // process replaced function if it is nested inside another function
        const directives = fun.node.body.directives;
        if (
          directives &&
          directives.length > 0 &&
          directives.some(
            (directive) =>
              isDirectiveLiteral(directive.value) &&
              directive.value.value === 'worklet'
          )
        ) {
          processWorkletFunction(fun, state);
        }
      }
    },
  });
}
