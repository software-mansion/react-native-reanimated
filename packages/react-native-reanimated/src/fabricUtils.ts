/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';
import type { ShadowNodeWrapper, WrapperRef } from './commonTypes';
import type { HostInstance } from './platform-specific/findHostInstance';
import { findHostInstance } from './platform-specific/findHostInstance';

let getInternalInstanceHandleFromPublicInstance: (ref: unknown) => {
  stateNode: { node: unknown };
};

export function getShadowNodeWrapperFromRef(
  ref: WrapperRef,
  hostInstance?: HostInstance
): ShadowNodeWrapper {
  if (getInternalInstanceHandleFromPublicInstance === undefined) {
    try {
      getInternalInstanceHandleFromPublicInstance =
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance')
          .getInternalInstanceHandleFromPublicInstance ??
        ((_ref: any) => _ref._internalInstanceHandle);
    } catch {
      getInternalInstanceHandleFromPublicInstance = (_ref: any) =>
        _ref._internalInstanceHandle;
    }
  }

  const resolvedRef =
    ref.getScrollResponder?.()?.getNativeScrollRef?.() ??
    ref.getNativeScrollRef?.() ??
    ref;

  const resolvedInstance =
    ref?.__internalInstanceHandle ??
    getInternalInstanceHandleFromPublicInstance(
      hostInstance ?? findHostInstance(resolvedRef)
    );

  return resolvedInstance?.stateNode?.node;
}
