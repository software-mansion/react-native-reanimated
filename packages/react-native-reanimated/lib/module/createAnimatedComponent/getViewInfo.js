'use strict';

/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: Clean this up since 0.74 is the minimum supported version now.
// This is a makeshift solution to handle both 0.73 and 0.74 versions of React Native.
export let getViewInfo = element => {
  if (element._nativeTag !== undefined && element.__nativeTag !== null) {
    getViewInfo = getViewInfo73;
    return getViewInfo73(element);
  } else if (element.__nativeTag !== undefined && element.__nativeTag !== null) {
    getViewInfo = getViewInfoLatest;
    return getViewInfoLatest(element);
  }
  return getViewInfo73(element);
};
function getViewInfo73(element) {
  return {
    // we can access view tag in the same way it's accessed here https://github.com/facebook/react/blob/e3f4eb7272d4ca0ee49f27577156b57eeb07cf73/packages/react-native-renderer/src/ReactFabric.js#L146
    viewName: element?.viewConfig?.uiViewClassName,
    /**
     * RN uses viewConfig for components for storing different properties of the
     * component(example:
     * https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Components/ScrollView/ScrollViewNativeComponent.js#L24).
     * The name we're looking for is in the field named uiViewClassName.
     */
    viewTag: element?._nativeTag,
    viewConfig: element?.viewConfig
  };
}
function getViewInfoLatest(element) {
  return {
    viewName: element?._viewConfig?.uiViewClassName,
    viewTag: element?.__nativeTag,
    viewConfig: element?._viewConfig
  };
}
//# sourceMappingURL=getViewInfo.js.map