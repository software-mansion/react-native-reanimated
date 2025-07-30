/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<b569abc0d196e023c230a066a12fb982>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/TextInput/TextInputState.js
 */

import type { HostInstance } from "../../../src/private/types/HostInstance";
declare function currentlyFocusedInput(): null | undefined | HostInstance;
/**
 * Returns the ID of the currently focused text field, if one exists
 * If no text field is focused it returns null
 */
declare function currentlyFocusedField(): null | undefined | number;
declare function focusInput(textField: null | undefined | HostInstance): void;
declare function blurInput(textField: null | undefined | HostInstance): void;
declare function focusField(textFieldID: null | undefined | number): void;
declare function blurField(textFieldID: null | undefined | number): void;
/**
 * @param {number} TextInputID id of the text field to focus
 * Focuses the specified text field
 * noop if the text field was already focused or if the field is not editable
 */
declare function focusTextInput(textField: null | undefined | HostInstance): void;
/**
 * @param {number} textFieldID id of the text field to unfocus
 * Unfocuses the specified text field
 * noop if it wasn't focused
 */
declare function blurTextInput(textField: null | undefined | HostInstance): void;
declare function registerInput(textField: HostInstance): void;
declare function unregisterInput(textField: HostInstance): void;
declare function isTextInput(textField: HostInstance): boolean;
declare const TextInputState: {
  currentlyFocusedInput: typeof currentlyFocusedInput;
  focusInput: typeof focusInput;
  blurInput: typeof blurInput;
  currentlyFocusedField: typeof currentlyFocusedField;
  focusField: typeof focusField;
  blurField: typeof blurField;
  focusTextInput: typeof focusTextInput;
  blurTextInput: typeof blurTextInput;
  registerInput: typeof registerInput;
  unregisterInput: typeof unregisterInput;
  isTextInput: typeof isTextInput;
};
declare const $$TextInputState: typeof TextInputState;
declare type $$TextInputState = typeof $$TextInputState;
export default $$TextInputState;
