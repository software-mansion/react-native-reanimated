import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { ReanimatedPluginPass } from './commonInterfaces';
import { makeWorklet } from './makeWorklet';

function processWorkletObjectMethod(
  t: typeof BabelCore.types,
  path: BabelCore.NodePath<BabelTypes.ObjectMethod>,
  state: ReanimatedPluginPass
) {
  // Replaces ObjectMethod with a workletized version of itself.

  if (!BabelTypes.isFunctionParent(path)) return;

  const newFun = makeWorklet(t, path, state);

  const replacement = BabelTypes.objectProperty(
    BabelTypes.identifier(
      BabelTypes.isIdentifier(path.node.key) ? path.node.key.name : ''
    ),
    t.callExpression(newFun, [])
  );

  path.replaceWith(replacement);
}

export { processWorkletObjectMethod };
