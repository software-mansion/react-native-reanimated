'use strict';
/* eslint-disable camelcase */

import { isFabric } from './PlatformChecker';
import type { ShadowNodeWrapper } from './commonTypes';

interface HostInstance {
  _internalInstanceHandle: {
    stateNode: {
      node: ShadowNodeWrapper;
    };
  };
}

let findHostInstance_DEPRECATED: (ref: React.Component) => HostInstance;

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
  return findHostInstance_DEPRECATED(ref)._internalInstanceHandle.stateNode
    .node;
}
