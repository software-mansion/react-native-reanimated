import type { NodePath } from '@babel/core';
import { isBlockStatement, isDirectiveLiteral } from '@babel/types';
import { processIfWorkletFunction } from './processIfWorkletFunction';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';

export function processIfWorkletNode(
  fun: NodePath<ExplicitWorklet>,
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
          processIfWorkletFunction(fun, state);
        }
      }
    },
  });
}
