import type { NodePath } from '@babel/traverse';
import {
  type ClassMethod,
  classProperty,
  cloneNode,
  functionExpression,
  isFunctionParameter,
  isIdentifier,
  isPrivateName,
} from '@babel/types';

export function processIfWorkletMethod(path: NodePath<ClassMethod>) {
  if (!path.node.body.directives.some((d) => d.value.value === 'worklet')) {
    return;
  }

  if (path.node.kind !== 'method' || isPrivateName(path.node.key)) {
    return;
  }

  const key = path.node.key;
  const functionId =
    !path.node.computed && isIdentifier(key) ? cloneNode(key, true) : null;

  path.replaceWith(
    classProperty(
      cloneNode(key, true),
      functionExpression(
        functionId,
        path.node.params
          .filter((p) => isFunctionParameter(p))
          .map((p) => cloneNode(p, true)),
        cloneNode(path.node.body, true),
        path.node.generator,
        path.node.async
      ),
      null,
      null,
      path.node.computed,
      path.node.static
    )
  );
}
