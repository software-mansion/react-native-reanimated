/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<6842d64249aef95b59a877aa283e6364>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Keyboard/Keyboard.js
 */

import type { EventSubscription } from "../../vendor/emitter/EventEmitter";
export type KeyboardEventName = keyof KeyboardEventDefinitions;
export type KeyboardEventEasing = "easeIn" | "easeInEaseOut" | "easeOut" | "linear" | "keyboard";
export type KeyboardMetrics = Readonly<{
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}>;
export type KeyboardEvent = AndroidKeyboardEvent | IOSKeyboardEvent;
type BaseKeyboardEvent = {
  duration: number;
  easing: KeyboardEventEasing;
  endCoordinates: KeyboardMetrics;
};
export type AndroidKeyboardEvent = Readonly<Omit<BaseKeyboardEvent, keyof {
  duration: 0;
  easing: "keyboard";
}> & {
  duration: 0;
  easing: "keyboard";
}>;
export type IOSKeyboardEvent = Readonly<Omit<BaseKeyboardEvent, keyof {
  startCoordinates: KeyboardMetrics;
  isEventFromThisApp: boolean;
}> & {
  startCoordinates: KeyboardMetrics;
  isEventFromThisApp: boolean;
}>;
type KeyboardEventDefinitions = {
  keyboardWillShow: [KeyboardEvent];
  keyboardDidShow: [KeyboardEvent];
  keyboardWillHide: [KeyboardEvent];
  keyboardDidHide: [KeyboardEvent];
  keyboardWillChangeFrame: [KeyboardEvent];
  keyboardDidChangeFrame: [KeyboardEvent];
};
/**
 * `Keyboard` module to control keyboard events.
 *
 * ### Usage
 *
 * The Keyboard module allows you to listen for native events and react to them, as
 * well as make changes to the keyboard, like dismissing it.
 *
 *```
 * import React, { Component } from 'react';
 * import { Keyboard, TextInput } from 'react-native';
 *
 * class Example extends Component {
 *   componentWillMount () {
 *     this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
 *     this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
 *   }
 *
 *   componentWillUnmount () {
 *     this.keyboardDidShowListener.remove();
 *     this.keyboardDidHideListener.remove();
 *   }
 *
 *   _keyboardDidShow () {
 *     alert('Keyboard Shown');
 *   }
 *
 *   _keyboardDidHide () {
 *     alert('Keyboard Hidden');
 *   }
 *
 *   render() {
 *     return (
 *       <TextInput
 *         onSubmitEditing={Keyboard.dismiss}
 *       />
 *     );
 *   }
 * }
 *```
 */

declare class KeyboardImpl {
  constructor();
  addListener<K extends keyof KeyboardEventDefinitions>(eventType: K, listener: (...$$REST$$: KeyboardEventDefinitions[K]) => unknown, context?: unknown): EventSubscription;
  removeAllListeners<K extends keyof KeyboardEventDefinitions>(eventType: null | undefined | K): void;
  dismiss(): void;
  isVisible(): boolean;
  metrics(): null | undefined | KeyboardMetrics;
  scheduleLayoutAnimation(event: KeyboardEvent): void;
}
declare const Keyboard: KeyboardImpl;
declare const $$Keyboard: typeof Keyboard;
declare type $$Keyboard = typeof $$Keyboard;
export default $$Keyboard;
