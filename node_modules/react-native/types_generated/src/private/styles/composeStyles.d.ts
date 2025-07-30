/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<7faa3377394c4af89922687d48617d9d>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/styles/composeStyles.js
 */

import type { ImageStyle, TextStyle, ViewStyle } from "../../../Libraries/StyleSheet/StyleSheet";
import type { StyleProp } from "../../../Libraries/StyleSheet/StyleSheetTypes";
/**
 * Combines two styles such that `style2` will override any styles in `style1`.
 * If either style is null or undefined, the other one is returned without
 * allocating an array, saving allocations and enabling memoization.
 */
declare function composeStyles<T extends ViewStyle | ImageStyle | TextStyle, U extends T, V extends T>(style1: null | undefined | StyleProp<U>, style2: null | undefined | StyleProp<V>): null | undefined | StyleProp<T>;
export default composeStyles;
