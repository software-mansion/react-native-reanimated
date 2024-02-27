'use strict';
/* eslint-disable camelcase */

import { isFabric } from './PlatformChecker';
import type { ShadowNodeWrapper } from './commonTypes';

interface HostInstance {
  __internalInstanceHandle: {
    stateNode: {
      node: ShadowNodeWrapper;
    };
  };
}

let findHostInstance_DEPRECATED: (ref: React.Component) => HostInstance;
let getInternalInstanceHandleFromPublicInstance: (ref: any) => {
  stateNode: { node: any };
};

export function getShadowNodeWrapperFromRef(
  ref: React.Component
): ShadowNodeWrapper {
  if (!findHostInstance_DEPRECATED && isFabric()) {
    try {
      findHostInstance_DEPRECATED =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('react-native/Libraries/Renderer/shims/ReactFabric').findHostInstance_DEPRECATED;
    } catch (e) {
      throw new Error(
        '[Reanimated] Cannot import `findHostInstance_DEPRECATED`.'
      );
    }
  }
  
  // load findHostInstance_DEPRECATED lazily because it may not be available before render
  if (getInternalInstanceHandleFromPublicInstance === undefined) {
    try {
      getInternalInstanceHandleFromPublicInstance =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance').getInternalInstanceHandleFromPublicInstance;
    } catch (e) {
      '[Reanimated] Cannot import `getInternalInstanceHandleFromPublicInstance`.'
    }
  }

  // @ts-ignore Fabric
  return getInternalInstanceHandleFromPublicInstance(
    findHostInstance_DEPRECATED(ref)
  ).stateNode.node;
}
