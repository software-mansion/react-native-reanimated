/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<5a862471b9390d8830905ee2b8dcdbdb>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/AppState/AppState.js
 */

import { type EventSubscription } from "../vendor/emitter/EventEmitter";
/**
 * active - The app is running in the foreground
 * background - The app is running in the background. The user is either:
 *   - in another app
 *   - on the home screen
 *   - @platform android - on another Activity (even if it was launched by your app)
 * @platform ios - inactive - This is a state that occurs when transitioning between foreground & background, and during periods of inactivity such as entering the multitasking view, opening the Notification Center or in the event of an incoming call.
 */
export type AppStateStatus = "inactive" | "background" | "active" | "extension" | "unknown";
/**
 * change - This even is received when the app state has changed.
 * memoryWarning - This event is used in the need of throwing memory warning or releasing it.
 * @platform android - focus - Received when the app gains focus (the user is interacting with the app).
 * @platform android - blur - Received when the user is not actively interacting with the app.
 */
/**
 * change - This even is received when the app state has changed.
 * memoryWarning - This event is used in the need of throwing memory warning or releasing it.
 * @platform android - focus - Received when the app gains focus (the user is interacting with the app).
 * @platform android - blur - Received when the user is not actively interacting with the app.
 */
type AppStateEventDefinitions = {
  change: [AppStateStatus];
  memoryWarning: [];
  blur: [];
  focus: [];
};
export type AppStateEvent = keyof AppStateEventDefinitions;
/**
 * `AppState` can tell you if the app is in the foreground or background,
 * and notify you when the state changes.
 *
 * See https://reactnative.dev/docs/appstate
 */
declare class AppStateImpl {
  currentState: null | undefined | string;
  isAvailable: boolean;
  constructor();
  addEventListener<K extends AppStateEvent>(type: K, handler: (...$$REST$$: AppStateEventDefinitions[K]) => void): EventSubscription;
}
declare const AppState: AppStateImpl;
declare const $$AppState: typeof AppState;
declare type $$AppState = typeof $$AppState;
export default $$AppState;
