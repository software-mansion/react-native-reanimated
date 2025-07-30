/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<aabc83f2f69c05f6b54aecb5d869e877>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/TextInput/TextInput.js
 */

import type { HostInstance } from "../../../src/private/types/HostInstance";
import type { AutoCapitalize, EnterKeyHintType, EnterKeyHintTypeAndroid, EnterKeyHintTypeIOS, EnterKeyHintTypeOptions, InputModeOptions, KeyboardType, KeyboardTypeAndroid, KeyboardTypeIOS, KeyboardTypeOptions, ReturnKeyType, ReturnKeyTypeAndroid, ReturnKeyTypeIOS, ReturnKeyTypeOptions, SubmitBehavior, TextContentType, TextInputAndroidProps, TextInputBlurEvent, TextInputChangeEvent, TextInputContentSizeChangeEvent, TextInputEditingEvent, TextInputEndEditingEvent, TextInputEvent, TextInputFocusEvent, TextInputIOSProps, TextInputKeyPressEvent, TextInputProps, TextInputSelectionChangeEvent, TextInputSubmitEditingEvent, TextInputType } from "./TextInput.flow";
export type { AutoCapitalize, EnterKeyHintType, EnterKeyHintTypeAndroid, EnterKeyHintTypeIOS, EnterKeyHintTypeOptions, InputModeOptions, KeyboardType, KeyboardTypeAndroid, KeyboardTypeIOS, KeyboardTypeOptions, ReturnKeyType, ReturnKeyTypeAndroid, ReturnKeyTypeIOS, ReturnKeyTypeOptions, SubmitBehavior, TextContentType, TextInputAndroidProps, TextInputBlurEvent, TextInputChangeEvent, TextInputContentSizeChangeEvent, TextInputEditingEvent, TextInputEndEditingEvent, TextInputEvent, TextInputFocusEvent, TextInputIOSProps, TextInputKeyPressEvent, TextInputProps, TextInputSelectionChangeEvent, TextInputSubmitEditingEvent };
type TextInputStateType = Readonly<{
  /**
   * @deprecated Use currentlyFocusedInput
   * Returns the ID of the currently focused text field, if one exists
   * If no text field is focused it returns null
   */
  currentlyFocusedField: () => number | undefined;
  /**
   * Returns the ref of the currently focused text field, if one exists
   * If no text field is focused it returns null
   */
  currentlyFocusedInput: () => HostInstance | undefined;
  /**
   * @param textField ref of the text field to focus
   * Focuses the specified text field
   * noop if the text field was already focused
   */
  focusTextInput: (textField: HostInstance | undefined) => void;
  /**
   * @param textField ref of the text field to focus
   * Unfocuses the specified text field
   * noop if it wasn't focused
   */
  blurTextInput: (textField: HostInstance | undefined) => void;
}>;
export type TextInputComponentStatics = Readonly<{
  State: TextInputStateType;
}>;
declare const $$TextInput: TextInputType;
declare type $$TextInput = typeof $$TextInput;
export default $$TextInput;
