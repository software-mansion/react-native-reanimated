import { NodePath } from '@babel/core';
import {
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  callExpression,
  isScopable,
  isExportNamedDeclaration,
  isArrowFunctionExpression,
  variableDeclaration,
  isFunctionParent,
  variableDeclarator,
} from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { makeWorklet } from './makeWorklet';

function processWorkletFunction(
  fun: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
) {
  // Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
  // with a workletized version of itself.

  if (!isFunctionParent(fun)) {
    return;
  }

  const newFun = makeWorklet(fun, state);

  const replacement = callExpression(newFun, []);

  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to define variable for the function
  const needDeclaration =
    isScopable(fun.parent) || isExportNamedDeclaration(fun.parent);
  fun.replaceWith(
    !isArrowFunctionExpression(fun.node) && fun.node.id && needDeclaration
      ? variableDeclaration('const', [
          variableDeclarator(fun.node.id, replacement),
        ])
      : replacement
  );
}

export { processWorkletFunction };
