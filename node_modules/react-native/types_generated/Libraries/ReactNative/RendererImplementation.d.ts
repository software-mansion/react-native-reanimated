/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<e12b3e680b8407c4905db8d2cb8b5b1b>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/RendererImplementation.js
 */

import type { HostInstance } from "../../src/private/types/HostInstance";
import type { InternalInstanceHandle, Node } from "../Renderer/shims/ReactNativeTypes";
import { type RootTag } from "./RootTag";
import * as React from "react";
export declare function renderElement($$PARAM_0$$: {
  element: React.JSX.Element;
  rootTag: number;
  useFabric: boolean;
  useConcurrentRoot: boolean;
}): void;
export declare function findHostInstance_DEPRECATED<TElementType extends React.ElementType>(componentOrHandle: null | undefined | (React.ComponentRef<TElementType> | number)): null | undefined | HostInstance;
export declare function findNodeHandle<TElementType extends React.ElementType>(componentOrHandle: null | undefined | (React.ComponentRef<TElementType> | number)): null | undefined | number;
export declare function dispatchCommand(handle: HostInstance, command: string, args: Array<unknown>): void;
export declare function sendAccessibilityEvent(handle: HostInstance, eventType: string): void;
/**
 * This method is used by AppRegistry to unmount a root when using the old
 * React Native renderer (Paper).
 */
export declare function unmountComponentAtNodeAndRemoveContainer(rootTag: RootTag): void;
export declare function unstable_batchedUpdates<T>(fn: ($$PARAM_0$$: T) => void, bookkeeping: T): void;
export declare function isProfilingRenderer(): boolean;
export declare function isChildPublicInstance(parentInstance: HostInstance, childInstance: HostInstance): boolean;
export declare function getNodeFromInternalInstanceHandle(internalInstanceHandle: InternalInstanceHandle): null | undefined | Node;
export declare function getPublicInstanceFromInternalInstanceHandle(internalInstanceHandle: InternalInstanceHandle): unknown;
export declare function getPublicInstanceFromRootTag(rootTag: number): unknown;
