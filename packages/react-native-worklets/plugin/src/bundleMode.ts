import type { NodePath } from '@babel/core';
import { booleanLiteral, type ExpressionStatement } from '@babel/types';

import type { WorkletsPluginPass } from './types';

/**
 * This function replaces the `false` value in
 *
 * `globalThis._WORKLETS_BUNDLE_MODE = false;`
 *
 * With `true` in the `workletRuntimeEntry` file when the `bundleMode` option is
 * enabled in the Babel plugin.
 *
 * This way Bundle Mode is not accidentally set up in eager import environments,
 */
export function toggleBundleMode(
  path: NodePath<ExpressionStatement>,
  state: WorkletsPluginPass
) {
  if (
    !state.opts.bundleMode ||
    !state.filename?.includes('workletRuntimeEntry')
  ) {
    return;
  }

  const expressionPath = path.get('expression');

  if (!expressionPath.isAssignmentExpression()) {
    return;
  }

  const left = expressionPath.get('left');

  if (!left.isMemberExpression()) {
    return;
  }

  const object = left.get('object');
  const property = left.get('property');

  if (
    !object.isIdentifier() ||
    object.node.name !== 'globalThis' ||
    !property.isIdentifier() ||
    property.node.name !== '_WORKLETS_BUNDLE_MODE'
  ) {
    return;
  }

  const right = expressionPath.get('right');

  right.replaceWith(booleanLiteral(true));
}
