'use strict';

/* eslint-disable */
import { findHostInstance } from './platform-specific/findHostInstance';
let getInternalInstanceHandleFromPublicInstance;
export function getShadowNodeWrapperFromRef(ref, hostInstance) {
  if (getInternalInstanceHandleFromPublicInstance === undefined) {
    try {
      getInternalInstanceHandleFromPublicInstance = require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance').getInternalInstanceHandleFromPublicInstance ?? (_ref => _ref._internalInstanceHandle);
    } catch (e) {
      getInternalInstanceHandleFromPublicInstance = _ref => _ref._internalInstanceHandle;
    }
  }

  // TODO: Clean this up since 0.74 is the minimum supported version now.
  // taken from https://github.com/facebook/react-native/commit/803bb16531697233686efd475f004c1643e03617#diff-d8172256c6d63b5d32db10e54d7b10f37a26b337d5280d89f5bfd7bcea778292R196
  // @ts-ignore some weird stuff on RN 0.74 - see examples with scrollView
  const scrollViewRef = ref?.getScrollResponder?.()?.getNativeScrollRef?.();
  // @ts-ignore some weird stuff on RN 0.74  - see examples with scrollView
  const otherScrollViewRef = ref?.getNativeScrollRef?.();
  // @ts-ignore some weird stuff on RN 0.74 - see setNativeProps example
  const textInputRef = ref?.__internalInstanceHandle?.stateNode?.node;
  let resolvedRef;
  if (scrollViewRef) {
    resolvedRef = scrollViewRef.__internalInstanceHandle.stateNode.node;
  } else if (otherScrollViewRef) {
    resolvedRef = otherScrollViewRef.__internalInstanceHandle.stateNode.node;
  } else if (textInputRef) {
    resolvedRef = textInputRef;
  } else {
    const instance = hostInstance ?? findHostInstance(ref);
    resolvedRef = getInternalInstanceHandleFromPublicInstance(instance).stateNode.node;
  }
  return resolvedRef;
}
//# sourceMappingURL=fabricUtils.js.map