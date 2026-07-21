import type { NodePath } from '@babel/core';
import type {
  ArrowFunctionExpression,
  BlockStatement,
  Directive,
} from '@babel/types';
import {
  blockStatement,
  directive,
  directiveLiteral,
  isBlockStatement,
  returnStatement,
} from '@babel/types';

import type { WorkletizableFunction } from './types';

export function handleWorkletDirective(path: NodePath<Directive>): void {
  if (
    path.node.value.value === 'worklet' &&
    path.parentPath.isBlockStatement()
  ) {
    addDirective(path.parentPath.node, 'use no memo');
  }
}

export function addWorkletDirectivesToPath(
  path: NodePath<WorkletizableFunction>
): void {
  if (path.isArrowFunctionExpression()) {
    replaceImplicitReturnWithBlock(path.node);
  }
  addWorkletDirectivesToBody(path.node.body as BlockStatement);
}

export function addWorkletDirectivesToBody(node: BlockStatement): void {
  addDirective(node, 'worklet');
  addDirective(node, 'use no memo');
}

export function addDirective(node: BlockStatement, dir: string): void {
  if (
    !node.directives.some(
      (functionDirective) => functionDirective.value.value === dir
    )
  ) {
    node.directives.push(directive(directiveLiteral(dir)));
  }
}

/**
 * Replaces implicit return statements with a block statement i.e.:
 *
 * `() => 1` becomes `() => { return 1 }`
 *
 * It's necessary because directives are only allowed on block statements.
 */
function replaceImplicitReturnWithBlock(path: ArrowFunctionExpression) {
  if (!isBlockStatement(path.body)) {
    path.body = blockStatement([returnStatement(path.body)]);
  }
}
