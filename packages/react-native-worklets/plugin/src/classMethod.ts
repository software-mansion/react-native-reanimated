import type { NodePath } from '@babel/traverse';
import {
  type ClassMethod,
  classProperty,
  cloneNode,
  functionExpression,
  isFunctionParameter,
  isIdentifier,
} from '@babel/types';
import { strict as assert } from 'assert';

export function processIfWorkletMethod(path: NodePath<ClassMethod>) {
  if (path.node.body.directives.some((d) => d.value.value === 'worklet')) {
    assert(
      isIdentifier(path.node.key),
      'ClassMethod key must be an Identifier'
    );
    const methodIdentifier = path.node.key;
    path.replaceWith(
      classProperty(
        cloneNode(methodIdentifier, true),
        functionExpression(
          cloneNode(methodIdentifier, true),
          path.node.params
            .filter((p) => isFunctionParameter(p))
            .map((p) => cloneNode(p, true)),
          cloneNode(path.node.body, true),
          path.node.generator,
          path.node.async
        )
      )
    );
  }
}
