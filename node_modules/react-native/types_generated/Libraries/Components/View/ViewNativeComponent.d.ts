/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<d385f4c8b0c0eae68157b089750ce667>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/View/ViewNativeComponent.js
 */

import type { HostComponent } from "../../../src/private/types/HostComponent";
import type { HostInstance } from "../../../src/private/types/HostInstance";
import { type ViewProps as Props } from "./ViewPropTypes";
declare const ViewNativeComponent: HostComponent<Props>;
interface NativeCommands {
  readonly hotspotUpdate: (viewRef: HostInstance, x: number, y: number) => void;
  readonly setPressed: (viewRef: HostInstance, pressed: boolean) => void;
}
export declare const Commands: NativeCommands;
export declare type Commands = typeof Commands;
declare const $$ViewNativeComponent: typeof ViewNativeComponent;
declare type $$ViewNativeComponent = typeof $$ViewNativeComponent;
export default $$ViewNativeComponent;
export type ViewNativeComponentType = HostComponent<Props>;
