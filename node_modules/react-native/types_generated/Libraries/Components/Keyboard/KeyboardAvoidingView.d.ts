/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<da462a04b86773863782542a0486047a>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js
 */

import type { ViewStyleProp } from "../../StyleSheet/StyleSheet";
import type { ViewProps } from "../View/ViewPropTypes";
import View from "../View/View";
import * as React from "react";
export type KeyboardAvoidingViewProps = Readonly<Omit<ViewProps, keyof {
  /**
   * Specify how to react to the presence of the keyboard.
   */
  behavior?: ("height" | "position" | "padding") | undefined;
  /**
   * Style of the content container when `behavior` is 'position'.
   */
  contentContainerStyle?: ViewStyleProp | undefined;
  /**
   * Controls whether this `KeyboardAvoidingView` instance should take effect.
   * This is useful when more than one is on the screen. Defaults to true.
   */
  enabled?: boolean | undefined;
  /**
   * Distance between the top of the user screen and the React Native view. This
   * may be non-zero in some cases. Defaults to 0.
   */
  keyboardVerticalOffset?: number;
}> & {
  /**
   * Specify how to react to the presence of the keyboard.
   */
  behavior?: ("height" | "position" | "padding") | undefined;
  /**
   * Style of the content container when `behavior` is 'position'.
   */
  contentContainerStyle?: ViewStyleProp | undefined;
  /**
   * Controls whether this `KeyboardAvoidingView` instance should take effect.
   * This is useful when more than one is on the screen. Defaults to true.
   */
  enabled?: boolean | undefined;
  /**
   * Distance between the top of the user screen and the React Native view. This
   * may be non-zero in some cases. Defaults to 0.
   */
  keyboardVerticalOffset?: number;
}>;
type KeyboardAvoidingViewState = {
  bottom: number;
};
/**
 * View that moves out of the way when the keyboard appears by automatically
 * adjusting its height, position, or bottom padding.
 */
declare class KeyboardAvoidingView extends React.Component<KeyboardAvoidingViewProps, KeyboardAvoidingViewState> {
  viewRef: {
    current: React.ComponentRef<typeof View> | null;
  };
  constructor(props: KeyboardAvoidingViewProps);
  componentDidUpdate(_: KeyboardAvoidingViewProps, prevState: KeyboardAvoidingViewState): void;
  componentDidMount(): void;
  componentWillUnmount(): void;
  render(): React.ReactNode;
}
export default KeyboardAvoidingView;
