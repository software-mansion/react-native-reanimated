/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<43f16ab7e818e072285697b61aa13ad6>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Touchable/TouchableHighlight.js
 */

import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { TouchableWithoutFeedbackProps } from "./TouchableWithoutFeedback";
import View from "../../Components/View/View";
import { type ViewStyleProp } from "../../StyleSheet/StyleSheet";
import * as React from "react";
type AndroidProps = Readonly<{
  nextFocusDown?: number | undefined;
  nextFocusForward?: number | undefined;
  nextFocusLeft?: number | undefined;
  nextFocusRight?: number | undefined;
  nextFocusUp?: number | undefined;
}>;
type IOSProps = Readonly<{
  hasTVPreferredFocus?: boolean | undefined;
}>;
type TouchableHighlightBaseProps = Readonly<{
  /**
   * Determines what the opacity of the wrapped view should be when touch is active.
   */
  activeOpacity?: number | undefined;
  /**
   * The color of the underlay that will show through when the touch is active.
   */
  underlayColor?: ColorValue | undefined;
  /**
   * @see https://reactnative.dev/docs/view#style
   */
  style?: ViewStyleProp | undefined;
  /**
   * Called immediately after the underlay is shown
   */
  onShowUnderlay?: (() => void) | undefined;
  /**
   * Called immediately after the underlay is hidden
   */
  onHideUnderlay?: (() => void) | undefined;
  testOnly_pressed?: boolean | undefined;
  hostRef?: React.Ref<React.ComponentRef<typeof View>>;
}>;
export type TouchableHighlightProps = Readonly<Omit<TouchableWithoutFeedbackProps, keyof AndroidProps | keyof IOSProps | keyof TouchableHighlightBaseProps | keyof {}> & Omit<AndroidProps, keyof IOSProps | keyof TouchableHighlightBaseProps | keyof {}> & Omit<IOSProps, keyof TouchableHighlightBaseProps | keyof {}> & Omit<TouchableHighlightBaseProps, keyof {}> & {}>;
declare const TouchableHighlight: (props: Omit<Readonly<Omit<TouchableHighlightProps, "hostRef">>, keyof {
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}> & {
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}) => React.ReactNode;
declare const $$TouchableHighlight: typeof TouchableHighlight;
declare type $$TouchableHighlight = typeof $$TouchableHighlight;
export default $$TouchableHighlight;
