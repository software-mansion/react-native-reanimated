/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<32eb27ee61e1d336b7579726c59bcd6e>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Modal/Modal.js
 */

import type { HostInstance } from "../../src/private/types/HostInstance";
import type { ViewProps } from "../Components/View/ViewPropTypes";
import type { DirectEventHandler } from "../Types/CodegenTypes";
import { type ColorValue } from "../StyleSheet/StyleSheet";
import * as React from "react";
export type PublicModalInstance = HostInstance;
type OrientationChangeEvent = Readonly<{
  orientation: "portrait" | "landscape";
}>;
export type ModalBaseProps = {
  /**
   * @deprecated Use animationType instead
   */
  animated?: boolean;
  /**
   * The `animationType` prop controls how the modal animates.
   *
   * - `slide` slides in from the bottom
   * - `fade` fades into view
   * - `none` appears without an animation
   */
  animationType?: ("none" | "slide" | "fade") | undefined;
  /**
   * The `transparent` prop determines whether your modal will fill the entire view.
   * Setting this to `true` will render the modal over a transparent background.
   */
  transparent?: boolean | undefined;
  /**
   * The `visible` prop determines whether your modal is visible.
   */
  visible?: boolean | undefined;
  /**
   * The `onRequestClose` callback is called when the user taps the hardware back button on Android or the menu button on Apple TV.
   *
   * This is required on Apple TV and Android.
   */
  onRequestClose?: DirectEventHandler<null> | undefined;
  /**
   * The `onShow` prop allows passing a function that will be called once the modal has been shown.
   */
  onShow?: DirectEventHandler<null> | undefined;
  /**
   * The `backdropColor` props sets the background color of the modal's container.
   * Defaults to `white` if not provided and transparent is `false`. Ignored if `transparent` is `true`.
   */
  backdropColor?: ColorValue;
  /**
   * A ref to the native Modal component.
   */
  modalRef?: React.Ref<PublicModalInstance>;
};
export type ModalPropsIOS = {
  /**
   * The `presentationStyle` determines the style of modal to show
   */
  presentationStyle?: ("fullScreen" | "pageSheet" | "formSheet" | "overFullScreen") | undefined;
  /**
   * The `supportedOrientations` prop allows the modal to be rotated to any of the specified orientations.
   * On iOS, the modal is still restricted by what's specified in your app's Info.plist's UISupportedInterfaceOrientations field.
   */
  supportedOrientations?: ReadonlyArray<"portrait" | "portrait-upside-down" | "landscape" | "landscape-left" | "landscape-right"> | undefined;
  /**
   * The `onDismiss` prop allows passing a function that will be called once the modal has been dismissed.
   */
  onDismiss?: (() => void) | undefined;
  /**
   * The `onOrientationChange` callback is called when the orientation changes while the modal is being displayed.
   * The orientation provided is only 'portrait' or 'landscape'. This callback is also called on initial render, regardless of the current orientation.
   */
  onOrientationChange?: DirectEventHandler<OrientationChangeEvent> | undefined;
};
export type ModalPropsAndroid = {
  /**
   *  Controls whether to force hardware acceleration for the underlying window.
   */
  hardwareAccelerated?: boolean | undefined;
  /**
   *  Determines whether your modal should go under the system statusbar.
   */
  statusBarTranslucent?: boolean | undefined;
  /**
   *  Determines whether your modal should go under the system navigationbar.
   */
  navigationBarTranslucent?: boolean | undefined;
};
export type ModalProps = Omit<ModalBaseProps, keyof ModalPropsIOS | keyof ModalPropsAndroid | keyof ViewProps | keyof {}> & Omit<ModalPropsIOS, keyof ModalPropsAndroid | keyof ViewProps | keyof {}> & Omit<ModalPropsAndroid, keyof ViewProps | keyof {}> & Omit<ViewProps, keyof {}> & {};
type ModalRefProps = Readonly<{
  ref?: React.Ref<PublicModalInstance>;
}>;
declare function Wrapper($$PARAM_0$$: Omit<ModalRefProps, keyof ModalProps | keyof {}> & Omit<ModalProps, keyof {}> & {}): React.ReactNode;
declare const $$Modal: typeof Wrapper;
declare type $$Modal = typeof $$Modal;
export default $$Modal;
