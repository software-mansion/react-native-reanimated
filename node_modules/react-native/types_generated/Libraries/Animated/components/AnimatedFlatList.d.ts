/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<176398c5af1905b551d343377340c335>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/components/AnimatedFlatList.js
 */

import type { AnimatedProps } from "../createAnimatedComponent";
import FlatList, { type FlatListProps } from "../../Lists/FlatList";
import * as React from "react";
declare const $$AnimatedFlatList: <ItemT = any>(props: Omit<AnimatedProps<FlatListProps<ItemT>>, keyof {
  ref?: React.Ref<FlatList<ItemT>>;
}> & {
  ref?: React.Ref<FlatList<ItemT>>;
}) => React.ReactNode;
declare type $$AnimatedFlatList = typeof $$AnimatedFlatList;
export default $$AnimatedFlatList;
