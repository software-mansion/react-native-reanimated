'use strict';

import type { HostInstance } from '../platform-specific/findHostInstance';

export function getViewInfo(element: HostInstance): {
  viewTag?: number;
  componentName?: string;
} {
  return {
    componentName: (element?._viewConfig?.uiViewClassName ??
      element?.__internalInstanceHandle?.type ??
      element?.__internalInstanceHandle?.elementType) as string,
    viewTag: element?.__nativeTag,
  };
}
