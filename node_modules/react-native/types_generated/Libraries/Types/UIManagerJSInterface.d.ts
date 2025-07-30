/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5518526fd551e8470332180f0abbc675>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Types/UIManagerJSInterface.js
 */

import type { Spec } from "../ReactNative/NativeUIManager";
export interface UIManagerJSInterface extends Spec {
  readonly getViewManagerConfig: (viewManagerName: string) => Object;
  readonly hasViewManagerConfig: (viewManagerName: string) => boolean;
}
