'use strict';
/* eslint-disable */

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
      findHostInstance_DEPRECATED =
        require('react-native/Libraries/Renderer/shims/ReactFabric').findHostInstance_DEPRECATED;
    } catch (e) {
      findHostInstance_DEPRECATED = (_ref: unknown) => null;
    }
  }

  if (getInternalInstanceHandleFromPublicInstance === undefined) {
    try {
      getInternalInstanceHandleFromPublicInstance =
        require('react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance')
          .getInternalInstanceHandleFromPublicInstance ??
        ((_ref: any) => _ref._internalInstanceHandle);
    } catch (e) {
      getInternalInstanceHandleFromPublicInstance = (_ref: any) =>
        _ref._internalInstanceHandle;
    }
  }

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
    resolvedRef = getInternalInstanceHandleFromPublicInstance(
      findHostInstance_DEPRECATED(ref)
    ).stateNode.node;
  }

  return resolvedRef;
}
