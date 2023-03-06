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
  isFunctionDeclaration,
  isFunctionExpression,
  variableDeclarator,
} from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { makeWorklet } from './makeWorklet';

export function processIfWorkletFunction(
  path: NodePath<any> | Array<NodePath<any>>,
  state: ReanimatedPluginPass
): void {
  if (
    isFunctionDeclaration(path) ||
    isFunctionExpression(path) ||
    isArrowFunctionExpression(path)
  )
    processWorkletFunction(
      path as NodePath<
        FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
      >,
      state
    );
}

function processWorkletFunction(
  fun: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
): void {
  // Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
  // with a workletized version of itself.

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
    'id' in fun.node && fun.node.id && needDeclaration
      ? variableDeclaration('const', [
          variableDeclarator(fun.node.id, replacement),
        ])
      : replacement
  );
}
