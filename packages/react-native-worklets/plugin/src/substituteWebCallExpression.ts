import type { NodePath } from '@babel/core';
import type { CallExpression } from '@babel/types';
import { booleanLiteral, isIdentifier } from '@babel/types';

export function substituteWebCallExpression(path: NodePath<CallExpression>) {
  const callee = path.node.callee;
  if (isIdentifier(callee)) {
    const name = callee.name;
    if (name === 'isWeb' || name === 'shouldBeUseWeb') {
      path.replaceWith(booleanLiteral(true));
    }
  }
}
