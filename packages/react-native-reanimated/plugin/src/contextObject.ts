import type { NodePath } from '@babel/core';
import {
  blockStatement,
  cloneNode,
  directive,
  directiveLiteral,
  functionExpression,
  identifier,
  isIdentifier,
  isObjectProperty,
  objectProperty,
  returnStatement,
} from '@babel/types';
import type { ObjectExpression } from '@babel/types';
import type { ReanimatedPluginPass } from './types';

export const contextObjectMarker = '__workletContextObject';

export function processIfWorkletContextObject(
  path: NodePath<ObjectExpression>,
  _state: ReanimatedPluginPass
): boolean {
  if (!isContextObject(path.node)) {
    return false;
  }

  removeContextObjectMarker(path.node);
  processWorkletContextObject(path.node);
  return true;
}

export function isContextObject(objectExpression: ObjectExpression): boolean {
  return objectExpression.properties.some(
    (property) =>
      isObjectProperty(property) &&
      isIdentifier(property.key) &&
      property.key.name === contextObjectMarker
  );
}

function processWorkletContextObject(objectExpression: ObjectExpression): void {
  // A simple factory function that returns the context object.
  const workletObjectFactory = functionExpression(
    null,
    [],
    blockStatement(
      [returnStatement(cloneNode(objectExpression))],
      [directive(directiveLiteral('worklet'))]
    )
  );

  objectExpression.properties.push(
    objectProperty(
      identifier(`${contextObjectMarker}Factory`),
      workletObjectFactory
    )
  );
}

function removeContextObjectMarker(objectExpression: ObjectExpression): void {
  objectExpression.properties = objectExpression.properties.filter(
    (property) =>
      !(
        isObjectProperty(property) &&
        isIdentifier(property.key) &&
        property.key.name === contextObjectMarker
      )
  );
}
