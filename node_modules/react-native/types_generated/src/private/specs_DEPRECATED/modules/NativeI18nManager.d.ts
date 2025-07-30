/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5bedcfb790a3ba679e988e7b2e122d79>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/specs_DEPRECATED/modules/NativeI18nManager.js
 */

import type { TurboModule } from "../../../../Libraries/TurboModule/RCTExport";
export type I18nManagerConstants = {
  doLeftAndRightSwapInRTL: boolean;
  isRTL: boolean;
  localeIdentifier?: string | undefined;
};
export interface Spec extends TurboModule {
  readonly getConstants: () => I18nManagerConstants;
  allowRTL: (allowRTL: boolean) => void;
  forceRTL: (forceRTL: boolean) => void;
  swapLeftAndRightInRTL: (flipStyles: boolean) => void;
}
declare const $$NativeI18nManager: null | undefined | Spec;
declare type $$NativeI18nManager = typeof $$NativeI18nManager;
export default $$NativeI18nManager;
