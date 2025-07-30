/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<732f02e04657dcacd88ec51ea95fcb32>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/DrawerAndroid/DrawerLayoutAndroidTypes.js
 */

import type { MeasureInWindowOnSuccessCallback, MeasureLayoutOnSuccessCallback, MeasureOnSuccessCallback } from "../../../src/private/types/HostInstance";
import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { NativeSyntheticEvent } from "../../Types/CoreEventTypes";
import type { ViewProps } from "../View/ViewPropTypes";
import * as React from "react";
export type DrawerStates = "Idle" | "Dragging" | "Settling";
export type DrawerSlideEvent = NativeSyntheticEvent<Readonly<{
  offset: number;
}>>;
export type DrawerLayoutAndroidProps = Readonly<Omit<ViewProps, keyof {
  /**
   * Determines whether the keyboard gets dismissed in response to a drag.
   *   - 'none' (the default), drags do not dismiss the keyboard.
   *   - 'on-drag', the keyboard is dismissed when a drag begins.
   */
  keyboardDismissMode?: ("none" | "on-drag") | undefined;
  /**
   * Specifies the background color of the drawer. The default value is white.
   * If you want to set the opacity of the drawer, use rgba. Example:
   *
   * ```
   * return (
   *   <DrawerLayoutAndroid drawerBackgroundColor="rgba(0,0,0,0.5)">
   *   </DrawerLayoutAndroid>
   * );
   * ```
   */
  drawerBackgroundColor?: ColorValue | undefined;
  /**
   * Specifies the side of the screen from which the drawer will slide in.
   */
  drawerPosition: ("left" | "right") | undefined;
  /**
   * Specifies the width of the drawer, more precisely the width of the view that be pulled in
   * from the edge of the window.
   */
  drawerWidth?: number | undefined;
  /**
   * Specifies the lock mode of the drawer. The drawer can be locked in 3 states:
   * - unlocked (default), meaning that the drawer will respond (open/close) to touch gestures.
   * - locked-closed, meaning that the drawer will stay closed and not respond to gestures.
   * - locked-open, meaning that the drawer will stay opened and not respond to gestures.
   * The drawer may still be opened and closed programmatically (`openDrawer`/`closeDrawer`).
   */
  drawerLockMode?: ("unlocked" | "locked-closed" | "locked-open") | undefined;
  /**
   * Function called whenever there is an interaction with the navigation view.
   */
  onDrawerSlide?: ((event: DrawerSlideEvent) => unknown) | undefined;
  /**
   * Function called when the drawer state has changed. The drawer can be in 3 states:
   * - Idle, meaning there is no interaction with the navigation view happening at the time
   * - Dragging, meaning there is currently an interaction with the navigation view
   * - Settling, meaning that there was an interaction with the navigation view, and the
   * navigation view is now finishing its closing or opening animation
   */
  onDrawerStateChanged?: ((state: DrawerStates) => unknown) | undefined;
  /**
   * Function called whenever the navigation view has been opened.
   */
  onDrawerOpen?: (() => unknown) | undefined;
  /**
   * Function called whenever the navigation view has been closed.
   */
  onDrawerClose?: (() => unknown) | undefined;
  /**
   * The navigation view that will be rendered to the side of the screen and can be pulled in.
   */
  renderNavigationView: () => React.JSX.Element;
  /**
   * Make the drawer take the entire screen and draw the background of the
   * status bar to allow it to open over the status bar. It will only have an
   * effect on API 21+.
   */
  statusBarBackgroundColor?: ColorValue | undefined;
}> & {
  /**
   * Determines whether the keyboard gets dismissed in response to a drag.
   *   - 'none' (the default), drags do not dismiss the keyboard.
   *   - 'on-drag', the keyboard is dismissed when a drag begins.
   */
  keyboardDismissMode?: ("none" | "on-drag") | undefined;
  /**
   * Specifies the background color of the drawer. The default value is white.
   * If you want to set the opacity of the drawer, use rgba. Example:
   *
   * ```
   * return (
   *   <DrawerLayoutAndroid drawerBackgroundColor="rgba(0,0,0,0.5)">
   *   </DrawerLayoutAndroid>
   * );
   * ```
   */
  drawerBackgroundColor?: ColorValue | undefined;
  /**
   * Specifies the side of the screen from which the drawer will slide in.
   */
  drawerPosition: ("left" | "right") | undefined;
  /**
   * Specifies the width of the drawer, more precisely the width of the view that be pulled in
   * from the edge of the window.
   */
  drawerWidth?: number | undefined;
  /**
   * Specifies the lock mode of the drawer. The drawer can be locked in 3 states:
   * - unlocked (default), meaning that the drawer will respond (open/close) to touch gestures.
   * - locked-closed, meaning that the drawer will stay closed and not respond to gestures.
   * - locked-open, meaning that the drawer will stay opened and not respond to gestures.
   * The drawer may still be opened and closed programmatically (`openDrawer`/`closeDrawer`).
   */
  drawerLockMode?: ("unlocked" | "locked-closed" | "locked-open") | undefined;
  /**
   * Function called whenever there is an interaction with the navigation view.
   */
  onDrawerSlide?: ((event: DrawerSlideEvent) => unknown) | undefined;
  /**
   * Function called when the drawer state has changed. The drawer can be in 3 states:
   * - Idle, meaning there is no interaction with the navigation view happening at the time
   * - Dragging, meaning there is currently an interaction with the navigation view
   * - Settling, meaning that there was an interaction with the navigation view, and the
   * navigation view is now finishing its closing or opening animation
   */
  onDrawerStateChanged?: ((state: DrawerStates) => unknown) | undefined;
  /**
   * Function called whenever the navigation view has been opened.
   */
  onDrawerOpen?: (() => unknown) | undefined;
  /**
   * Function called whenever the navigation view has been closed.
   */
  onDrawerClose?: (() => unknown) | undefined;
  /**
   * The navigation view that will be rendered to the side of the screen and can be pulled in.
   */
  renderNavigationView: () => React.JSX.Element;
  /**
   * Make the drawer take the entire screen and draw the background of the
   * status bar to allow it to open over the status bar. It will only have an
   * effect on API 21+.
   */
  statusBarBackgroundColor?: ColorValue | undefined;
}>;
export type DrawerLayoutAndroidState = {
  drawerOpened: boolean;
};
export interface DrawerLayoutAndroidMethods {
  /**
   * Opens the drawer.
   */
  openDrawer(): void;
  /**
   * Closes the drawer.
   */
  closeDrawer(): void;
  /**
   * Native methods
   */
  blur(): void;
  focus(): void;
  measure(callback: MeasureOnSuccessCallback): void;
  measureInWindow(callback: MeasureInWindowOnSuccessCallback): void;
  measureLayout(relativeToNativeNode: number, onSuccess: MeasureLayoutOnSuccessCallback, onFail?: () => void): void;
  setNativeProps(nativeProps: Object): void;
}
