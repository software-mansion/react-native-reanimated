/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<66bc3759f6820cc5d49137f7cc5e25a8>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/StyleSheet/flattenStyle.js
 */

import type AnimatedNode from "../Animated/nodes/AnimatedNode";
import type { ____DangerouslyImpreciseAnimatedStyleProp_Internal, ____FlattenStyleProp_Internal } from "./StyleSheetTypes";
type NonAnimatedNodeObject<TStyleProp> = TStyleProp extends AnimatedNode ? never : TStyleProp;
declare function flattenStyle<TStyleProp extends ____DangerouslyImpreciseAnimatedStyleProp_Internal>(style: null | undefined | TStyleProp): null | undefined | NonAnimatedNodeObject<____FlattenStyleProp_Internal<TStyleProp>>;
declare const $$flattenStyle: typeof flattenStyle;
declare type $$flattenStyle = typeof $$flattenStyle;
export default $$flattenStyle;
