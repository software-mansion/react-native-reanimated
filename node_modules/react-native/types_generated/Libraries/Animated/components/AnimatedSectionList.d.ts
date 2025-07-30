/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<aedda1f50ecb98b51a19456b5702ce87>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/components/AnimatedSectionList.js
 */

import type { AnimatedProps } from "../createAnimatedComponent";
import SectionList, { type SectionListProps } from "../../Lists/SectionList";
import * as React from "react";
declare const $$AnimatedSectionList: <ItemT = any, SectionT = any>(props: Omit<AnimatedProps<SectionListProps<ItemT, SectionT>>, keyof {
  ref?: React.Ref<SectionList<ItemT, SectionT>>;
}> & {
  ref?: React.Ref<SectionList<ItemT, SectionT>>;
}) => React.ReactNode;
declare type $$AnimatedSectionList = typeof $$AnimatedSectionList;
export default $$AnimatedSectionList;
