'use strict';

export function getViewInfo(element) {
  return {
    viewName: element?._viewConfig?.uiViewClassName ?? element?.__internalInstanceHandle?.type ?? element?.__internalInstanceHandle?.elementType,
    viewTag: element?.__nativeTag
  };
}
//# sourceMappingURL=getViewInfo.js.map