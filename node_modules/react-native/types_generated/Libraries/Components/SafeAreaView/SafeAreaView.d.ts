/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<799d448d7ff240cf78810a6c6774a878>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/SafeAreaView/SafeAreaView.js
 */

import type { ViewProps } from "../View/ViewPropTypes";
import View from "../View/View";
import * as React from "react";
declare const exported: (props: Omit<ViewProps, keyof {
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}> & {
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}) => React.ReactNode;
/**
 * Renders nested content and automatically applies paddings reflect the portion
 * of the view that is not covered by navigation bars, tab bars, toolbars, and
 * other ancestor views.
 *
 * Moreover, and most importantly, Safe Area's paddings reflect physical
 * limitation of the screen, such as rounded corners or camera notches (aka
 * sensor housing area on iPhone X).
 */
declare const $$SafeAreaView: typeof exported;
declare type $$SafeAreaView = typeof $$SafeAreaView;
export default $$SafeAreaView;
