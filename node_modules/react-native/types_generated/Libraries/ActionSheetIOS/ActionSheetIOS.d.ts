/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<c7b207a46aa232adaab368b5778f463f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/ActionSheetIOS/ActionSheetIOS.js
 */

import type { ProcessedColorValue } from "../StyleSheet/processColor";
import type { ColorValue } from "../StyleSheet/StyleSheet";
export type ActionSheetIOSOptions = Readonly<{
  title?: string | undefined;
  message?: string | undefined;
  options: Array<string>;
  destructiveButtonIndex?: (number | undefined) | (Array<number> | undefined);
  cancelButtonIndex?: number | undefined;
  anchor?: number | undefined;
  tintColor?: ColorValue | ProcessedColorValue;
  cancelButtonTintColor?: ColorValue | ProcessedColorValue;
  disabledButtonTintColor?: ColorValue | ProcessedColorValue;
  userInterfaceStyle?: string;
  disabledButtonIndices?: Array<number>;
}>;
export type ShareActionSheetIOSOptions = Readonly<{
  message?: string | undefined;
  url?: string | undefined;
  subject?: string | undefined;
  anchor?: number | undefined;
  tintColor?: number | undefined;
  cancelButtonTintColor?: number | undefined;
  disabledButtonTintColor?: number | undefined;
  excludedActivityTypes?: Array<string> | undefined;
  userInterfaceStyle?: string | undefined;
}>;
export type ShareActionSheetError = Readonly<{
  domain: string;
  code: string;
  userInfo?: Object | undefined;
  message: string;
}>;
declare const ActionSheetIOS: {
  /**
   * Display an iOS action sheet.
   *
   * The `options` object must contain one or more of:
   *
   * - `options` (array of strings) - a list of button titles (required)
   * - `cancelButtonIndex` (int) - index of cancel button in `options`
   * - `destructiveButtonIndex` (int or array of ints) - index or indices of destructive buttons in `options`
   * - `title` (string) - a title to show above the action sheet
   * - `message` (string) - a message to show below the title
   * - `disabledButtonIndices` (array of numbers) - a list of button indices which should be disabled
   *
   * The 'callback' function takes one parameter, the zero-based index
   * of the selected item.
   *
   * See https://reactnative.dev/docs/actionsheetios#showactionsheetwithoptions
   */
  showActionSheetWithOptions(options: ActionSheetIOSOptions, callback: (buttonIndex: number) => void): void;
  /**
   * Display the iOS share sheet. The `options` object should contain
   * one or both of `message` and `url` and can additionally have
   * a `subject` or `excludedActivityTypes`:
   *
   * - `url` (string) - a URL to share
   * - `message` (string) - a message to share
   * - `subject` (string) - a subject for the message
   * - `excludedActivityTypes` (array) - the activities to exclude from
   *   the ActionSheet
   * - `tintColor` (color) - tint color of the buttons
   *
   * The 'failureCallback' function takes one parameter, an error object.
   * The only property defined on this object is an optional `stack` property
   * of type `string`.
   *
   * The 'successCallback' function takes two parameters:
   *
   * - a boolean value signifying success or failure
   * - a string that, in the case of success, indicates the method of sharing
   *
   * See https://reactnative.dev/docs/actionsheetios#showshareactionsheetwithoptions
   */
  showShareActionSheetWithOptions(options: ShareActionSheetIOSOptions, failureCallback: Function | ((error: ShareActionSheetError) => void), successCallback: Function | ((success: boolean, method: null | undefined | string) => void)): void;
  /**
   * Dismisses the most upper iOS action sheet presented, if no action sheet is
   * present a warning is displayed.
   */
  dismissActionSheet: () => void;
};
/**
 * Display action sheets and share sheets on iOS.
 *
 * See https://reactnative.dev/docs/actionsheetios
 */
declare const $$ActionSheetIOS: typeof ActionSheetIOS;
declare type $$ActionSheetIOS = typeof $$ActionSheetIOS;
export default $$ActionSheetIOS;
