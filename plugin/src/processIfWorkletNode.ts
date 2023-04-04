import { NodePath } from '@babel/core';
import {
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  isBlockStatement,
  isDirectiveLiteral,
} from '@babel/types';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import { ReanimatedPluginPass } from './types';

export function processIfWorkletNode(
  fun: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
) {
  let shouldBeProcessed = false;
  fun.traverse({
    DirectiveLiteral(path) {
      const value = path.node.value;
      if (value === 'worklet' && isBlockStatement(fun.node.body)) {
        const parent = path.getFunctionParent();
        if (parent === fun) {
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
            shouldBeProcessed = true;
          }
        } else if (
          state.opts.useOnExitLogicForWorkletNodes &&
          (parent?.isFunctionDeclaration() ||
            parent?.isFunctionExpression() ||
            parent?.isArrowFunctionExpression())
        ) {
          processIfWorkletNode(parent, state);
        }
      }
    },
  });

  if (shouldBeProcessed) {
    processIfWorkletFunction(fun, state);
  }
}
