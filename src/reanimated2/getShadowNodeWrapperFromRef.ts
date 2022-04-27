/* eslint-disable camelcase */

import { ShadowNodeWrapper } from './hook/commonTypes';

// Used by GestureDetector (unsupported on web at the moment) to check whether the
// attached view may get flattened on Fabric. This implementation causes errors
// on web due to the static resolution of `require` statements by webpack breaking
// the conditional importing. Solved by making .web file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let findHostInstance_DEPRECATED = (_ref: React.Component) => null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  findHostInstance_DEPRECATED =
    require('react-native/Libraries/Renderer/shims/ReactFabric').findHostInstance_DEPRECATED;
} catch (e) {
  // do nothing
}

export function getShadowNodeWrapperFromRef(
  ref: React.Component
): ShadowNodeWrapper {
  // @ts-ignore Fabric
  return findHostInstance_DEPRECATED(ref)._internalInstanceHandle.stateNode
    .node;
}
