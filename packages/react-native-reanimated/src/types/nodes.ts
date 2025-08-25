'use strict';

import type { AnimatedComponentRef } from '../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';

export interface Descriptor {
  tag: number | ReanimatedHTMLElement;
  shadowNodeWrapper: ShadowNodeWrapper;
}

export type ShadowNodeWrapper = {
  __hostObjectShadowNodeWrapper: never;
};

/**
 * @param x - A number representing X coordinate relative to the parent
 *   component.
 * @param y - A number representing Y coordinate relative to the parent
 *   component.
 * @param width - A number representing the width of the component.
 * @param height - A number representing the height of the component.
 * @param pageX - A number representing X coordinate relative to the screen.
 * @param pageY - A number representing Y coordinate relative to the screen.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure#returns
 */
export interface MeasuredDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

export interface ViewInfo {
  viewTag: number | AnimatedComponentRef | HTMLElement | null;
  shadowNodeWrapper: ShadowNodeWrapper | null;
  // This is a React host instance view name which might differ from the
  // Fabric component name. For clarity, we use the viewName property
  // here and componentName in C++ after converting react viewName to
  // Fabric component name.
  // (see react/renderer/componentregistry/componentNameByReactViewName.cpp)
  viewName?: string;
  DOMElement?: HTMLElement | null;
}
