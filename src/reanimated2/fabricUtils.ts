/* eslint-disable camelcase */

import { ShadowNodeWrapper } from './commonTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let findHostInstance_DEPRECATED = (_ref: React.Component) => null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  findHostInstance_DEPRECATED =
    require('react-native/Libraries/Renderer/shims/ReactFabric').findHostInstance_DEPRECATED;
} catch (e) {
  // do nothing
}

export function getShadowNodeWrapperFromHostInstance(
  hostInstance: unknown
): ShadowNodeWrapper {
  // @ts-ignore Fabric
  return hostInstance._internalInstanceHandle.stateNode.node;
}

export function getShadowNodeWrapperFromRef(
  ref: React.Component
): ShadowNodeWrapper {
  return getShadowNodeWrapperFromHostInstance(findHostInstance_DEPRECATED(ref));
}
