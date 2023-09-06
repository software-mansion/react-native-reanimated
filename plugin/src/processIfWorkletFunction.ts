import type { NodePath, Node } from '@babel/core';
import {
  callExpression,
  isScopable,
  isExportNamedDeclaration,
  variableDeclaration,
  variableDeclarator,
  blockStatement,
  returnStatement,
  isBlockStatement,
  isLogicalExpression,
} from '@babel/types';
import type { ExplicitWorklet, ReanimatedPluginPass } from './types';
import { WORKLET_DIRECTIVE, makeWorklet } from './makeWorklet';
import { hasWorkletDirective } from './processIfWorkletNode';

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
    // processWorkletFunction(path, state);
    annotateWorkletFunction(path, state);
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
function annotateWorkletFunction(
  path: NodePath<ExplicitWorklet>,
  state: ReanimatedPluginPass
) {
  const body = path.get('body');
  if (isBlockStatement(body.node)) {
    if (!hasWorkletDirective(body.node.directives)) {
      body.node.directives = [
        WORKLET_DIRECTIVE,
        ...(body.node.directives || []),
      ];
    }
  } else if (isLogicalExpression(body.node)) {
    const block = blockStatement([returnStatement(body.node)]);
    block.directives.push(WORKLET_DIRECTIVE);
    body.replaceWith(block);
  } else {
    throw new Error(
      `[Reanimated] Unsupported '${body.node.type}' type for annotation.`
    );
  }
}
