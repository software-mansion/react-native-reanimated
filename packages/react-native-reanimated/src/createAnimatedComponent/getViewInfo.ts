'use strict';

import type { ViewConfig } from '../ConfigHelper';
import type { HostInstance } from '../platform-specific/findHostInstance';

export function getViewInfo(element: HostInstance): {
  viewName?: string;
  viewTag?: number;
  viewConfig?: ViewConfig;
} {
  return {
    viewName: element?._viewConfig?.uiViewClassName as string,
    viewTag: element?.__nativeTag,
    viewConfig: element?._viewConfig as unknown as ViewConfig,
  };
}
