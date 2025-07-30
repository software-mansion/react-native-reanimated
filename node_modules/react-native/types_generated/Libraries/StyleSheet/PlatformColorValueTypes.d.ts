/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5b3e64b2226f542cc23a9519114a3d32>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/StyleSheet/PlatformColorValueTypes.js.flow
 */

import type { ProcessedColorValue } from "./processColor";
import type { ColorValue, NativeColorValue } from "./StyleSheet";
export declare function PlatformColor(...names: Array<string>): ColorValue;
export declare function normalizeColorObject(color: NativeColorValue): null | undefined | ProcessedColorValue;
export declare function processColorObject(color: NativeColorValue): null | undefined | NativeColorValue;
