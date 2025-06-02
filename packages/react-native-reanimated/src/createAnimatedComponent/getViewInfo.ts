'use strict';

import type { HostInstance } from '../platform-specific/findHostInstance';

export function getViewInfo(element: HostInstance) {
  return {
    viewName: element?._viewConfig?.uiViewClassName,
    viewTag: element?.__nativeTag,
    viewConfig: element?._viewConfig,
  };
}
