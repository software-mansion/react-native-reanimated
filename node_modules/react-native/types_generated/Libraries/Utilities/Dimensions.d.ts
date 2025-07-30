/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<441745b0ef27db7a99a2082d1211ab23>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/Dimensions.js
 */

import { type EventSubscription } from "../vendor/emitter/EventEmitter";
import { type DimensionsPayload, type DisplayMetrics, type DisplayMetricsAndroid } from "./NativeDeviceInfo";
export type { DimensionsPayload, DisplayMetrics, DisplayMetricsAndroid };
/** @deprecated Use DisplayMetrics */
export type ScaledSize = DisplayMetrics;
declare class Dimensions {
  static get(dim: string): DisplayMetrics | DisplayMetricsAndroid;
  static set(dims: Readonly<DimensionsPayload>): void;
  static addEventListener(type: "change", handler: Function): EventSubscription;
}
export default Dimensions;
