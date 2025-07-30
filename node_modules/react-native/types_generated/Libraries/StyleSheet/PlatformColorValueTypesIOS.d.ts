/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<d334ebcdbb162a1b7b477deeb57f426f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/StyleSheet/PlatformColorValueTypesIOS.js
 */

import type { ColorValue } from "./StyleSheet";
export type DynamicColorIOSTuple = {
  light: ColorValue;
  dark: ColorValue;
  highContrastLight?: ColorValue;
  highContrastDark?: ColorValue;
};
/**
 * Specify color to display depending on the current system appearance settings
 *
 * @param tuple Colors you want to use for "light mode" and "dark mode"
 * @platform ios
 */
export declare const DynamicColorIOS: (tuple: DynamicColorIOSTuple) => ColorValue;
export declare type DynamicColorIOS = typeof DynamicColorIOS;
