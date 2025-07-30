/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<8a177ee1cf268368fee5201f5f321266>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/specs_DEPRECATED/modules/NativeAppearance.js
 */

import type { TurboModule } from "../../../../Libraries/TurboModule/RCTExport";
export type ColorSchemeName = "light" | "dark" | "unspecified";
export type AppearancePreferences = {
  colorScheme?: ColorSchemeName | undefined;
};
export interface Spec extends TurboModule {
  readonly getColorScheme: () => ColorSchemeName | undefined;
  readonly setColorScheme: (colorScheme: ColorSchemeName) => void;
  readonly addListener: (eventName: string) => void;
  readonly removeListeners: (count: number) => void;
}
declare const $$NativeAppearance: null | undefined | Spec;
declare type $$NativeAppearance = typeof $$NativeAppearance;
export default $$NativeAppearance;
