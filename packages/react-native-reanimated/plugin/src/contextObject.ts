import type { NodePath } from '@babel/core';
import {
  blockStatement,
  callExpression,
  cloneNode,
  directive,
  directiveLiteral,
  functionExpression,
  identifier,
  isIdentifier,
  objectProperty,
  returnStatement,
} from '@babel/types';
import type { ObjectExpression } from '@babel/types';
import type { ReanimatedPluginPass } from './types';

export function processIfWorkletContextObject(
  path: NodePath<ObjectExpression>,
  state: ReanimatedPluginPass
): boolean {
  let isWorkletContextObject = false;

  path.traverse({
    ObjectProperty(subPath) {
      if (
        isIdentifier(subPath.node.key) &&
        subPath.node.key.name === '__workletObject'
      ) {
        isWorkletContextObject = true;
        subPath.stop();
      }
    },
  });

  if (isWorkletContextObject) {
    processWorkletContextObject(path, state);
  }

  return isWorkletContextObject;
}

function processWorkletContextObject(
  path: NodePath<ObjectExpression>,
  _state: ReanimatedPluginPass
): void {
  path.traverse({
    ObjectProperty(subPath) {
      if (
        isIdentifier(subPath.node.key) &&
        subPath.node.key.name === '__workletObject'
      ) {
        subPath.remove();
      }
    },
  });

  const workletObjectFactory = functionExpression(
    null,
    [],
    blockStatement(
      [returnStatement(cloneNode(path.node))],
      [directive(directiveLiteral('worklet'))]
    )
  );

  path.node.properties.push(
    objectProperty(identifier('__workletObjectFactory'), workletObjectFactory)
  );
}
