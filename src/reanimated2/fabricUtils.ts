'use strict';
/* eslint-disable camelcase */

import type { ShadowNodeWrapper } from './commonTypes';

let findHostInstance_DEPRECATED: (ref: unknown) => void;
let getInternalInstanceHandleFromPublicInstance: (ref: unknown) => {
  stateNode: { node: unknown };
};

export function getShadowNodeWrapperFromRef(
  ref: React.Component
): ShadowNodeWrapper {
  // load findHostInstance_DEPRECATED lazily because it may not be available before render
  if (findHostInstance_DEPRECATED === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      findHostInstance_DEPRECATED =
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
        require('react-native/Libraries/Renderer/shims/ReactFabric').findHostInstance_DEPRECATED;
    } catch (e) {
      findHostInstance_DEPRECATED = (_ref: unknown) => null;
    }
  }

  // load findHostInstance_DEPRECATED lazily because it may not be available before render
  if (getInternalInstanceHandleFromPublicInstance === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      getInternalInstanceHandleFromPublicInstance =
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
        require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance')
          .getInternalInstanceHandleFromPublicInstance ??
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        ((_ref: any) => _ref._internalInstanceHandle);
    } catch (e) {
      getInternalInstanceHandleFromPublicInstance = (_ref: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        _ref._internalInstanceHandle;
    }
  }

  // @ts-ignore Fabric
  return getInternalInstanceHandleFromPublicInstance(
    findHostInstance_DEPRECATED(ref)
  ).stateNode.node;
}
