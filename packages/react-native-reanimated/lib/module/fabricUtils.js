/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import { findHostInstance } from './platform-specific/findHostInstance';
let getInternalInstanceHandleFromPublicInstance;
export function getShadowNodeWrapperFromRef(ref, hostInstance) {
  if (getInternalInstanceHandleFromPublicInstance === undefined) {
    try {
      getInternalInstanceHandleFromPublicInstance =
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance').getInternalInstanceHandleFromPublicInstance ?? (_ref => _ref._internalInstanceHandle);
    } catch {
      getInternalInstanceHandleFromPublicInstance = _ref => _ref._internalInstanceHandle;
    }
  }
  const resolvedRef = ref.getScrollResponder?.()?.getNativeScrollRef?.() ?? ref.getNativeScrollRef?.() ?? ref;
  const resolvedInstance = ref?.__internalInstanceHandle ?? getInternalInstanceHandleFromPublicInstance(hostInstance ?? findHostInstance(resolvedRef));
  return resolvedInstance?.stateNode?.node;
}
//# sourceMappingURL=fabricUtils.js.map