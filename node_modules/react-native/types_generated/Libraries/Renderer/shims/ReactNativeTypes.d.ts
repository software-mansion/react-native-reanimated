/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5ea5277ca9a3c7ca0d03d874fbffc9d6>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Renderer/shims/ReactNativeTypes.js
 */

import type { Component as ReactComponent, ElementRef, ElementType, MixedElement } from "react";
import type { MeasureOnSuccessCallback, PublicInstance, PublicRootInstance, PublicTextInstance } from "react-native/Libraries/ReactPrivate/ReactNativePrivateInterface";
export type AttributeType<T, V> = true | Readonly<{
  diff?: (arg1: T, arg2: T) => boolean;
  process?: (arg1: V) => T;
}>;
export type AnyAttributeType = AttributeType<any, any>;
export type AttributeConfiguration = Readonly<{
  [propName: string]: AnyAttributeType;
  style: Readonly<{
    [propName: string]: AnyAttributeType;
  }>;
}>;
export type PartialAttributeConfiguration = Readonly<{
  [propName: string]: AnyAttributeType;
  style?: Readonly<{
    [propName: string]: AnyAttributeType;
  }>;
}>;
export type ViewConfig = Readonly<{
  Commands?: Readonly<{
    [commandName: string]: number;
  }>;
  Constants?: Readonly<{
    [name: string]: unknown;
  }>;
  Manager?: string;
  NativeProps?: Readonly<{
    [propName: string]: string;
  }>;
  baseModuleName?: string | undefined;
  bubblingEventTypes?: Readonly<{
    [eventName: string]: Readonly<{
      phasedRegistrationNames: Readonly<{
        captured: string;
        bubbled: string;
        skipBubbling?: boolean | undefined;
      }>;
    }>;
  }>;
  directEventTypes?: Readonly<{
    [eventName: string]: Readonly<{
      registrationName: string;
    }>;
  }>;
  supportsRawText?: boolean;
  uiViewClassName: string;
  validAttributes: AttributeConfiguration;
}>;
export type PartialViewConfig = Readonly<{
  bubblingEventTypes?: ViewConfig["bubblingEventTypes"];
  directEventTypes?: ViewConfig["directEventTypes"];
  supportsRawText?: boolean;
  uiViewClassName: string;
  validAttributes?: PartialAttributeConfiguration;
}>;
type InspectorDataProps = Readonly<{
  [propName: string]: string;
}>;
type InspectorDataGetter = ($$PARAM_0$$: <TElementType extends ElementType>(componentOrHandle: ElementRef<TElementType> | number) => null | undefined | number) => Readonly<{
  measure: (callback: MeasureOnSuccessCallback) => void;
  props: InspectorDataProps;
}>;
export type InspectorData = Readonly<{
  closestInstance?: unknown;
  hierarchy: Array<{
    name: string | undefined;
    getInspectorData: InspectorDataGetter;
  }>;
  selectedIndex: number | undefined;
  props: InspectorDataProps;
  componentStack: string;
}>;
export type TouchedViewDataAtPoint = Readonly<{
  pointerY: number;
  touchedViewTag?: number;
  frame: Readonly<{
    top: number;
    left: number;
    width: number;
    height: number;
  }>;
  closestPublicInstance?: PublicInstance;
} & InspectorData>;
export type RenderRootOptions = {
  onUncaughtError?: (error: unknown, errorInfo: {
    readonly componentStack?: string | undefined;
  }) => void;
  onCaughtError?: (error: unknown, errorInfo: {
    readonly componentStack?: string | undefined;
    readonly errorBoundary?: ReactComponent<any, any> | undefined;
  }) => void;
  onRecoverableError?: (error: unknown, errorInfo: {
    readonly componentStack?: string | undefined;
  }) => void;
};
/**
 * Flat ReactNative renderer bundles are too big for Flow to parse efficiently.
 * Provide minimal Flow typing for the high-level RN API and call it a day.
 */
export type ReactNativeType = {
  findHostInstance_DEPRECATED<TElementType extends ElementType>(componentOrHandle: (ElementRef<TElementType> | number) | undefined): PublicInstance | undefined;
  findNodeHandle<TElementType extends ElementType>(componentOrHandle: (ElementRef<TElementType> | number) | undefined): number | undefined;
  isChildPublicInstance(parent: PublicInstance, child: PublicInstance): boolean;
  dispatchCommand(handle: PublicInstance, command: string, args: Array<unknown>): void;
  sendAccessibilityEvent(handle: PublicInstance, eventType: string): void;
  render(element: MixedElement, containerTag: number, callback: (() => void) | undefined, options: RenderRootOptions | undefined): ElementRef<ElementType> | undefined;
  unmountComponentAtNode(containerTag: number): void;
  unmountComponentAtNodeAndRemoveContainer(containerTag: number): void;
  readonly unstable_batchedUpdates: <T>(fn: ($$PARAM_0$$: T) => void, bookkeeping: T) => void;
};
export declare type Node = symbol & {
  __Node__: string;
};
export declare type InternalInstanceHandle = symbol & {
  __InternalInstanceHandle__: string;
};
export type ReactFabricType = {
  findHostInstance_DEPRECATED<TElementType extends ElementType>(componentOrHandle: (ElementRef<TElementType> | number) | undefined): PublicInstance | undefined;
  findNodeHandle<TElementType extends ElementType>(componentOrHandle: (ElementRef<TElementType> | number) | undefined): number | undefined;
  dispatchCommand(handle: PublicInstance, command: string, args: Array<unknown>): void;
  isChildPublicInstance(parent: PublicInstance, child: PublicInstance): boolean;
  sendAccessibilityEvent(handle: PublicInstance, eventType: string): void;
  render(element: MixedElement, containerTag: number, callback: (() => void) | undefined, concurrentRoot: boolean | undefined, options: RenderRootOptions | undefined): ElementRef<ElementType> | undefined;
  unmountComponentAtNode(containerTag: number): void;
  getNodeFromInternalInstanceHandle(internalInstanceHandle: InternalInstanceHandle): Node | undefined;
  getPublicInstanceFromInternalInstanceHandle(internalInstanceHandle: InternalInstanceHandle): PublicInstance | PublicTextInstance | null;
  getPublicInstanceFromRootTag(rootTag: number): PublicRootInstance | null;
};
export type ReactFabricEventTouch = {
  identifier: number;
  locationX: number;
  locationY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  target: number;
  timestamp: number;
  force: number;
};
export type ReactFabricEvent = {
  touches: Array<ReactFabricEventTouch>;
  changedTouches: Array<ReactFabricEventTouch>;
  targetTouches: Array<ReactFabricEventTouch>;
  target: number;
};
export type LayoutAnimationType = "spring" | "linear" | "easeInEaseOut" | "easeIn" | "easeOut" | "keyboard";
export type LayoutAnimationProperty = "opacity" | "scaleX" | "scaleY" | "scaleXY";
export type LayoutAnimationAnimationConfig = Readonly<{
  duration?: number;
  delay?: number;
  springDamping?: number;
  initialVelocity?: number;
  type?: LayoutAnimationType;
  property?: LayoutAnimationProperty;
}>;
export type LayoutAnimationConfig = Readonly<{
  duration: number;
  create?: LayoutAnimationAnimationConfig;
  update?: LayoutAnimationAnimationConfig;
  delete?: LayoutAnimationAnimationConfig;
}>;
