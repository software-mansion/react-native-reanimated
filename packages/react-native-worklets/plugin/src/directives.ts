import type { ArrowFunctionExpression, BlockStatement } from '@babel/types';
import {
  blockStatement,
  directive,
  directiveLiteral,
  isBlockStatement,
  returnStatement,
} from '@babel/types';

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
 * This is necessary because the worklet directive is only allowed on block
 * statements.
 */
export function replaceImplicitReturnWithBlock(path: ArrowFunctionExpression) {
  if (!isBlockStatement(path.body)) {
    path.body = blockStatement([returnStatement(path.body)]);
  }
}
