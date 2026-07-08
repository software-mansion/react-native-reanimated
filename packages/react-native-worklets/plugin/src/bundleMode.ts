import type { NodePath } from '@babel/core';
import { booleanLiteral, type ExpressionStatement } from '@babel/types';
import { join } from 'path';

import type { WorkletsPluginPass } from './types';

const WORKLETS_PACKAGE = 'react-native-worklets';
const WORKLETS_SRC_DIR = join(WORKLETS_PACKAGE, 'src');
const WORKLETS_LIB_DIR = join(WORKLETS_PACKAGE, 'lib', 'module');

const togglePaths = [
  join(WORKLETS_SRC_DIR, 'index.ts'),
  join(WORKLETS_SRC_DIR, 'debug', 'bundleMode.native.ts'),
  join(WORKLETS_LIB_DIR, 'index.js'),
  join(WORKLETS_LIB_DIR, 'debug', 'bundleMode.native.js'),
];

/**
 * This function replaces the `false` value in
 *
 * `globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;`
 *
 * With `true` in each of the Worklets' toggle-target files when the
 * `bundleMode` option is enabled in the Babel plugin.
 *
 * This way Bundle Mode is not accidentally set up in eager import environments.
 */
export function toggleBundleMode(
  path: NodePath<ExpressionStatement>,
  state: WorkletsPluginPass
) {
  if (
    !state.opts.bundleMode ||
    !togglePaths.some((togglePath) => state.filename?.endsWith(togglePath))
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
    property.node.name !== '_WORKLETS_BUNDLE_MODE_ENABLED'
  ) {
    return;
  }

  const right = expressionPath.get('right');

  right.replaceWith(booleanLiteral(true));
}
