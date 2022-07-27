/* eslint-disable camelcase */

import { ShadowNodeWrapper } from './commonTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findHostInstance_DEPRECATED = (_ref: React.Component) => null;

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
