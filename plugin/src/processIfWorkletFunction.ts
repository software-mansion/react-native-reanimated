import { NodePath } from '@babel/core';
import {
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  callExpression,
  isScopable,
  isExportNamedDeclaration,
  isArrowFunctionExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  variableDeclaration,
  variableDeclarator,
  Node as BabelNode,
} from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { makeWorklet } from './makeWorklet';

// Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
// with a workletized version of itself.

function processIfWorkletFunction(
  path: NodePath<BabelNode> | Array<NodePath<BabelNode>>,
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
  path: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: ReanimatedPluginPass
): void {
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

export { processIfWorkletFunction };
