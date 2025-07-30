/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<bbdb3684f82fe4e5d53cd8658b52d699>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactFabricHostComponent.js
 */

import type { HostInstance, MeasureInWindowOnSuccessCallback, MeasureLayoutOnSuccessCallback, MeasureOnSuccessCallback, NativeMethods } from "../../../src/private/types/HostInstance";
import type { InternalInstanceHandle, ViewConfig } from "../../Renderer/shims/ReactNativeTypes";
/**
 * This is used for refs on host components.
 */
declare class ReactFabricHostComponent implements NativeMethods {
  constructor(tag: number, viewConfig: ViewConfig, internalInstanceHandle: InternalInstanceHandle);
  blur(): void;
  focus(): void;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
  measureLayout(relativeToNativeNode: number | HostInstance, onSuccess: MeasureLayoutOnSuccessCallback, onFail?: () => void): void;
  unstable_getBoundingClientRect(): DOMRect;
  setNativeProps(nativeProps: {}): void;
}
export default ReactFabricHostComponent;
