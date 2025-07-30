/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<9540cc7b6f9c456da84a7241c641882d>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/LayoutConformance/LayoutConformance.js
 */

import * as React from "react";
export type LayoutConformanceProps = Readonly<{
  /**
   * strict: Layout in accordance with W3C spec, even when breaking
   * compatibility: Layout with the same behavior as previous versions of React Native
   */
  mode: "strict" | "compatibility";
  children: React.ReactNode;
}>;
declare const $$LayoutConformance: (props: LayoutConformanceProps) => React.ReactNode;
declare type $$LayoutConformance = typeof $$LayoutConformance;
export default $$LayoutConformance;
