/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<8edfce57f450175c57377ce97f99f2a0>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/StatusBar/StatusBar.js
 */

import type { ColorValue } from "../../StyleSheet/StyleSheet";
import * as React from "react";
/**
 * Status bar style
 */
export type StatusBarStyle = keyof {
  /**
   * Default status bar style (dark for iOS, light for Android)
   */
  default: string;
  /**
   * Dark background, white texts and icons
   */
  "light-content": string;
  /**
   * Light background, dark texts and icons
   */
  "dark-content": string;
};
/**
 * Status bar animation
 */
export type StatusBarAnimation = keyof {
  /**
   * No animation
   */
  none: string;
  /**
   * Fade animation
   */
  fade: string;
  /**
   * Slide animation
   */
  slide: string;
};
export type StatusBarPropsAndroid = Readonly<{
  /**
   * The background color of the status bar.
   * @platform android
   */
  backgroundColor?: ColorValue | undefined;
  /**
   * If the status bar is translucent.
   * When translucent is set to true, the app will draw under the status bar.
   * This is useful when using a semi transparent status bar color.
   *
   * @platform android
   */
  translucent?: boolean | undefined;
}>;
export type StatusBarPropsIOS = Readonly<{
  /**
   * If the network activity indicator should be visible.
   *
   * @platform ios
   */
  networkActivityIndicatorVisible?: boolean | undefined;
  /**
   * The transition effect when showing and hiding the status bar using the `hidden`
   * prop. Defaults to 'fade'.
   *
   * @platform ios
   */
  showHideTransition?: ("fade" | "slide" | "none") | undefined;
}>;
type StatusBarBaseProps = Readonly<{
  /**
   * If the status bar is hidden.
   */
  hidden?: boolean | undefined;
  /**
   * If the transition between status bar property changes should be animated.
   * Supported for backgroundColor, barStyle and hidden.
   */
  animated?: boolean | undefined;
  /**
   * Sets the color of the status bar text.
   */
  barStyle?: ("default" | "light-content" | "dark-content") | undefined;
}>;
export type StatusBarProps = Readonly<Omit<StatusBarPropsAndroid, keyof StatusBarPropsIOS | keyof StatusBarBaseProps | keyof {}> & Omit<StatusBarPropsIOS, keyof StatusBarBaseProps | keyof {}> & Omit<StatusBarBaseProps, keyof {}> & {}>;
type StackProps = {
  backgroundColor: {
    value: StatusBarProps["backgroundColor"];
    animated: boolean;
  } | undefined;
  barStyle: {
    value: StatusBarProps["barStyle"];
    animated: boolean;
  } | undefined;
  translucent: StatusBarProps["translucent"];
  hidden: {
    value: boolean;
    animated: boolean;
    transition: StatusBarProps["showHideTransition"];
  } | undefined;
  networkActivityIndicatorVisible: StatusBarProps["networkActivityIndicatorVisible"];
};
/**
 * Component to control the app status bar.
 *
 * It is possible to have multiple `StatusBar` components mounted at the same
 * time. The props will be merged in the order the `StatusBar` components were
 * mounted.
 *
 * ### Imperative API
 *
 * For cases where using a component is not ideal, there are static methods
 * to manipulate the `StatusBar` display stack. These methods have the same
 * behavior as mounting and unmounting a `StatusBar` component.
 *
 * For example, you can call `StatusBar.pushStackEntry` to update the status bar
 * before launching a third-party native UI component, and then call
 * `StatusBar.popStackEntry` when completed.
 *
 * ```
 * const openThirdPartyBugReporter = async () => {
 *   // The bug reporter has a dark background, so we push a new status bar style.
 *   const stackEntry = StatusBar.pushStackEntry({barStyle: 'light-content'});
 *
 *   // `open` returns a promise that resolves when the UI is dismissed.
 *   await BugReporter.open();
 *
 *   // Don't forget to call `popStackEntry` when you're done.
 *   StatusBar.popStackEntry(stackEntry);
 * };
 * ```
 *
 * There is a legacy imperative API that enables you to manually update the
 * status bar styles. However, the legacy API does not update the internal
 * `StatusBar` display stack, which means that any changes will be overridden
 * whenever a `StatusBar` component is mounted or unmounted.
 *
 * It is strongly advised that you use `pushStackEntry`, `popStackEntry`, or
 * `replaceStackEntry` instead of the static methods beginning with `set`.
 *
 * ### Constants
 *
 * `currentHeight` (Android only) The height of the status bar.
 */
declare class StatusBar extends React.Component<StatusBarProps> {
  static currentHeight: null | undefined | number;
  static setHidden(hidden: boolean, animation?: StatusBarAnimation): void;
  static setBarStyle(style: StatusBarStyle, animated?: boolean): void;
  static setNetworkActivityIndicatorVisible(visible: boolean): void;
  static setBackgroundColor(color: ColorValue, animated?: boolean): void;
  static setTranslucent(translucent: boolean): void;
  static pushStackEntry(props: StatusBarProps): StackProps;
  static popStackEntry(entry: StackProps): void;
  static replaceStackEntry(entry: StackProps, props: StatusBarProps): StackProps;
  componentDidMount(): void;
  componentWillUnmount(): void;
  componentDidUpdate(): void;
  render(): React.ReactNode;
}
export default StatusBar;
