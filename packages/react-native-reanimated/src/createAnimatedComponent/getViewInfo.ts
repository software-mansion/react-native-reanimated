'use strict';

import type { HostInstance } from '../platform-specific/types';

// Component naming conventions used across the JS-to-native bridge:
//
//  jsComponentName     - The React/JS-facing name (e.g. "Text").
//                        Accessed via component.componentName in JS.
//  reactViewName       - The React Native bridge view class name
//                        (e.g. "RCTText"), sourced from uiViewClassName.
//                        This is what is passed across the bridge.
//  nativeComponentName - The Fabric/C++ component name (e.g. "Paragraph"),
//                        obtained on the C++ side by converting reactViewName
//                        via componentNameByReactViewName(). Used as the key
//                        in all C++ CSS registries.
//
// For 3rd-party components (e.g. SVG) reactViewName and nativeComponentName
// are identical. For built-in RN components they differ.
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
