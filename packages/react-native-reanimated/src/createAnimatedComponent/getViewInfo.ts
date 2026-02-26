'use strict';

import type { HostInstance } from '../platform-specific/types';

// Component naming convention:
//
//  componentDisplayNam - The React/JS-facing name (e.g. "Text").
//                        Accessed via Component.componentName in JS.
//  reactViewName       - The name React Native uses to identify the component
//                        (e.g. "RCTText"). This is what we use to identify
//                        the underlying React Native component name (it is the
//                        same as the native component name for most of third-party
//                        components (e.g. SVG) but is often different for built-in
//                        RN components (e.g. "RCTView").
//  nativeComponentName - The Fabric/C++ component name (e.g. "Paragraph").
//                        Can be obtained on the C++ side by converting
//                        reactViewName via componentNameByReactViewName().
export function getViewInfo(element: HostInstance): {
  reactViewName?: string;
  viewTag?: number;
} {
  return {
    reactViewName: (element?._viewConfig?.uiViewClassName ??
      element?.__internalInstanceHandle?.type ??
      element?.__internalInstanceHandle?.elementType) as string,
    viewTag: element?.__nativeTag,
  };
}
