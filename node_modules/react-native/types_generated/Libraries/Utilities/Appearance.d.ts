/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<56f6d279390564fa3d98321655c55f0b>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Utilities/Appearance.js
 */

import type { EventSubscription } from "../vendor/emitter/EventEmitter";
import type { AppearancePreferences, ColorSchemeName } from "./NativeAppearance";
export type { AppearancePreferences };
/**
 * Returns the current color scheme preference. This value may change, so the
 * value should not be cached without either listening to changes or using
 * the `useColorScheme` hook.
 */
export declare function getColorScheme(): null | undefined | ColorSchemeName;
/**
 * Updates the current color scheme to the supplied value.
 */
export declare function setColorScheme(colorScheme: null | undefined | ColorSchemeName): void;
/**
 * Add an event handler that is fired when appearance preferences change.
 */
export declare function addChangeListener(listener: ($$PARAM_0$$: {
  colorScheme: ColorSchemeName | undefined;
}) => void): EventSubscription;
