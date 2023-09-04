import type { NodePath } from '@babel/core';
import { isBlockStatement, isDirectiveLiteral } from '@babel/types';
import type { BlockStatement } from '@babel/types';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';

function hasWorkletDirective(directives: BlockStatement['directives']) {
  return (
    directives &&
    directives.length > 0 &&
    directives.some(
      (directive) =>
        isDirectiveLiteral(directive.value) &&
        directive.value.value === 'worklet'
    )
  );
}

export function processIfWorkletNode(
  fun: NodePath<ExplicitWorklet>,
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

          shouldBeProcessed = hasWorkletDirective(directives);
        } else if (
          state.opts.processNestedWorklets &&
          // use better function for that once proper merges come to life
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
