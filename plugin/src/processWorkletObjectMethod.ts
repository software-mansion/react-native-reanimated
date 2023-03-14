import { NodePath } from '@babel/core';
import {
  ObjectMethod,
  identifier,
  isIdentifier,
  objectProperty,
  callExpression,
} from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { makeWorklet } from './makeWorklet';

function processWorkletObjectMethod(
  path: NodePath<ObjectMethod>,
  state: ReanimatedPluginPass
): void {
  // Replaces ObjectMethod with a workletized version of itself.

  const newFun = makeWorklet(path, state);

  const replacement = objectProperty(
    identifier(isIdentifier(path.node.key) ? path.node.key.name : ''),
    callExpression(newFun, [])
  );

  path.replaceWith(replacement);
}

export { processWorkletObjectMethod };
