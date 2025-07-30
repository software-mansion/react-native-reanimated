/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a7d52f6c4f22875b4239d8d0557daf62>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricPublicInstance.js
 */

/**
 * This module is meant to be used by the React renderers to create public
 * instances and get some data from them (like their instance handle / fiber).
 */

import type ReactNativeDocumentT from "../../../src/private/webapis/dom/nodes/ReactNativeDocument";
import type ReactNativeElementT from "../../../src/private/webapis/dom/nodes/ReactNativeElement";
import type ReadOnlyTextT from "../../../src/private/webapis/dom/nodes/ReadOnlyText";
import type { InternalInstanceHandle, Node, ViewConfig } from "../../Renderer/shims/ReactNativeTypes";
import type { RootTag } from "../RootTag";
import type ReactFabricHostComponentT from "./ReactFabricHostComponent";
export declare type PublicRootInstance = symbol & {
  __PublicRootInstance__: string;
};
export declare function createPublicRootInstance(rootTag: RootTag): PublicRootInstance;
export declare function createPublicInstance(tag: number, viewConfig: ViewConfig, internalInstanceHandle: InternalInstanceHandle, ownerDocument: ReactNativeDocumentT): ReactFabricHostComponentT | ReactNativeElementT;
export declare function createPublicTextInstance(internalInstanceHandle: InternalInstanceHandle, ownerDocument: ReactNativeDocumentT): ReadOnlyTextT;
export declare function getNativeTagFromPublicInstance(publicInstance: ReactFabricHostComponentT | ReactNativeElementT): number;
export declare function getNodeFromPublicInstance(publicInstance: ReactFabricHostComponentT | ReactNativeElementT): null | undefined | Node;
export declare function getInternalInstanceHandleFromPublicInstance(publicInstance: ReactFabricHostComponentT | ReactNativeElementT): InternalInstanceHandle;
