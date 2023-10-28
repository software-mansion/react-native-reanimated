import type { NodePath } from '@babel/core';
import {
  callExpression,
  isScopable,
  isExportNamedDeclaration,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { makeWorklet } from './makeWorklet';

/**
 * Replaces `FunctionDeclaration`, `FunctionExpression` or `ArrowFunctionExpression`
 * with a workletized version of itself.
 */
export function processIfWorkletFunction(
  path: NodePath,
  state: ReanimatedPluginPass
) {
  if (
    path.isFunctionDeclaration() ||
    path.isFunctionExpression() ||
    path.isArrowFunctionExpression()
  ) {
    processWorkletFunction(path, state);
  }
}

function processWorkletFunction(
  path: NodePath<ExplicitWorklet>,
  state: ReanimatedPluginPass
) {
  const workletFactory = makeWorklet(path, state);

  const workletFactoryCall = callExpression(workletFactory, []);

  /* 
  If for some reason the code of the worklet is so bad that it
  causes the worklet factory to crash, eg.:

  function foo() {
    'worklet'
    unexistingVariable;
  };

  Such function will cause the factory to crash on closure creation because
  of reference to `unexistingVariable`.
  
  With this we are able to give a meaningful stack trace - we use `start` twice on purpose, since
  crashing on the factory leads to its end on the stack trace - the closing bracket. It's more
  approachable this way, when it points to the start of the original function.
  */
  const originalWorkletLocation = path.node.loc;
  if (originalWorkletLocation) {
    workletFactoryCall.callee.loc = {
      start: originalWorkletLocation.start,
      end: originalWorkletLocation.start,
    };
  }

  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to define variable for the function
  const needDeclaration =
    isScopable(path.parent) || isExportNamedDeclaration(path.parent);

  const replacement =
    'id' in path.node && path.node.id && needDeclaration
      ? variableDeclaration('const', [
          variableDeclarator(path.node.id, workletFactoryCall),
        ])
      : workletFactoryCall;

  path.replaceWith(replacement);
}
