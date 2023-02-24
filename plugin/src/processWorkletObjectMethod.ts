import { NodePath, PluginPass } from '@babel/core';
import {
  ObjectMethod,
  identifier,
  isIdentifier,
  isFunctionParent,
  objectProperty,
  callExpression,
} from '@babel/types';
import { makeWorklet } from './makeWorklet';

export function processWorkletObjectMethod(
  path: NodePath<ObjectMethod>,
  state: PluginPass
) {
  // Replaces ObjectMethod with a workletized version of itself.

  if (!isFunctionParent(path)) return;

  const newFun = makeWorklet(path, state);

  const replacement = objectProperty(
    identifier(isIdentifier(path.node.key) ? path.node.key.name : ''),
    callExpression(newFun, [])
  );

  path.replaceWith(replacement);
}
