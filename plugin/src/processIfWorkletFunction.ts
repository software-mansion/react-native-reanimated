import type { NodePath, Node } from '@babel/core';
import {
  callExpression,
  isScopable,
  isExportNamedDeclaration,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { makeWorklet } from './makeWorklet';

// Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
// with a workletized version of itself.

export function processIfWorkletFunction(
  path: NodePath<Node>,
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
  const newFun = makeWorklet(path, state);

  const replacement = callExpression(newFun, []);

  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to define variable for the function
  const needDeclaration =
    isScopable(path.parent) || isExportNamedDeclaration(path.parent);
  path.replaceWith(
    'id' in path.node && path.node.id && needDeclaration
      ? variableDeclaration('const', [
          variableDeclarator(path.node.id, replacement),
        ])
      : replacement
  );
}
