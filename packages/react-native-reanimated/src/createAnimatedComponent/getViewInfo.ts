'use strict';

import type { HostInstance } from '../platform-specific/findHostInstance';

export function getViewInfo(element: HostInstance): {
  viewName?: string;
  viewTag?: number;
} {
  return {
    viewName: element?._viewConfig?.uiViewClassName as string,
    viewTag: element?.__nativeTag,
  };
}
