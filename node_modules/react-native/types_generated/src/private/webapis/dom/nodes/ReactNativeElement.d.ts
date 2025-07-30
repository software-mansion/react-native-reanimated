/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<736347f55d2b3b9fa1e18e89e918773f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/nodes/ReactNativeElement.js
 */

import type { ViewConfig } from "../../../../../Libraries/Renderer/shims/ReactNativeTypes";
import type { HostInstance, MeasureInWindowOnSuccessCallback, MeasureLayoutOnSuccessCallback, MeasureOnSuccessCallback, NativeMethods } from "../../../types/HostInstance";
import type { InstanceHandle } from "./internals/NodeInternals";
import type ReactNativeDocument from "./ReactNativeDocument";
import ReadOnlyElement from "./ReadOnlyElement";
declare class ReactNativeElement extends ReadOnlyElement implements NativeMethods {
  constructor(tag: number, viewConfig: ViewConfig, instanceHandle: InstanceHandle, ownerDocument: ReactNativeDocument);
  get offsetHeight(): number;
  get offsetLeft(): number;
  get offsetParent(): ReadOnlyElement | null;
  get offsetTop(): number;
  get offsetWidth(): number;
  blur(): void;
  focus(): void;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
  measureLayout(relativeToNativeNode: number | HostInstance, onSuccess: MeasureLayoutOnSuccessCallback, onFail?: () => void): void;
  setNativeProps(nativeProps: {}): void;
}
export default ReactNativeElement;
