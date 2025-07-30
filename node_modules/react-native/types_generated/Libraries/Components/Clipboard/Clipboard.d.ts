/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5807c15a293ef687da6756282cf69532>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Clipboard/Clipboard.js
 */

/**
 * `Clipboard` gives you an interface for setting and getting content from Clipboard on both iOS and Android
 */
declare const $$Clipboard: {
  /**
   * Get content of string type, this method returns a `Promise`, so you can use following code to get clipboard content
   * ```javascript
   * async _getContent() {
   *   var content = await Clipboard.getString();
   * }
   * ```
   */
  getString(): Promise<string>;
  /**
   * Set content of string type. You can use following code to set clipboard content
   * ```javascript
   * _setContent() {
   *   Clipboard.setString('hello world');
   * }
   * ```
   * @param {string} content the content to be stored in the clipboard.
   */
  setString(content: string): void;
};
declare type $$Clipboard = typeof $$Clipboard;
export default $$Clipboard;
