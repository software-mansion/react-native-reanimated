/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<2cba860a6255d7618ced7a5693780f43>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo.js
 */

import type { TurboModule } from "../../../../Libraries/TurboModule/RCTExport";
export type DisplayMetricsAndroid = {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
  densityDpi: number;
};
export type DisplayMetrics = {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
};
export type DimensionsPayload = {
  window?: DisplayMetrics;
  screen?: DisplayMetrics;
  windowPhysicalPixels?: DisplayMetricsAndroid;
  screenPhysicalPixels?: DisplayMetricsAndroid;
};
export type DeviceInfoConstants = {
  readonly Dimensions: DimensionsPayload;
  readonly isIPhoneX_deprecated?: boolean;
};
export interface Spec extends TurboModule {
  readonly getConstants: () => DeviceInfoConstants;
}
declare const NativeDeviceInfo: {
  getConstants(): DeviceInfoConstants;
};
declare const $$NativeDeviceInfo: typeof NativeDeviceInfo;
declare type $$NativeDeviceInfo = typeof $$NativeDeviceInfo;
export default $$NativeDeviceInfo;
