/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<a9b32022fcae97b7d44b863b86e0fb17>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Alert/Alert.js
 */

/**
 * @platform ios
 */
export type AlertType = "default" | "plain-text" | "secure-text" | "login-password";
/**
 * @platform ios
 */
export type AlertButtonStyle = "default" | "cancel" | "destructive";
export type AlertButton = {
  text?: string;
  onPress?: (((value?: string) => any) | undefined) | (Function | undefined);
  isPreferred?: boolean;
  style?: AlertButtonStyle;
};
export type AlertButtons = Array<AlertButton>;
export type AlertOptions = {
  /** @platform android */
  cancelable?: boolean | undefined;
  userInterfaceStyle?: "unspecified" | "light" | "dark";
  /** @platform android */
  onDismiss?: (() => void) | undefined;
};
/**
 * Launches an alert dialog with the specified title and message.
 *
 * Optionally provide a list of buttons. Tapping any button will fire the
 * respective onPress callback and dismiss the alert. By default, the only
 * button will be an 'OK' button.
 *
 * This is an API that works both on iOS and Android and can show static
 * alerts. On iOS, you can show an alert that prompts the user to enter
 * some information.
 *
 * See https://reactnative.dev/docs/alert
 */
declare class Alert {
  static alert(title: null | undefined | string, message?: null | undefined | string, buttons?: AlertButtons, options?: AlertOptions): void;
  static prompt(title: null | undefined | string, message?: null | undefined | string, callbackOrButtons?: null | undefined | (((text: string) => void) | AlertButtons), type?: null | undefined | AlertType, defaultValue?: string, keyboardType?: string, options?: AlertOptions): void;
}
export default Alert;
