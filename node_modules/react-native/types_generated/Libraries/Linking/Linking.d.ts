/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<cc489f5aa3b36955339edc8a28953c70>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Linking/Linking.js
 */

import type { EventSubscription } from "../vendor/emitter/EventEmitter";
import NativeEventEmitter from "../EventEmitter/NativeEventEmitter";
type LinkingEventDefinitions = {
  url: [{
    url: string;
  }];
};
declare class LinkingImpl extends NativeEventEmitter<LinkingEventDefinitions> {
  constructor();
  addEventListener<K extends keyof LinkingEventDefinitions>(eventType: K, listener: (...$$REST$$: LinkingEventDefinitions[K]) => unknown): EventSubscription;
  openURL(url: string): Promise<void>;
  canOpenURL(url: string): Promise<boolean>;
  openSettings(): Promise<void>;
  getInitialURL(): Promise<null | undefined | string>;
  sendIntent(action: string, extras?: Array<{
    key: string;
    value: string | number | boolean;
  }>): Promise<void>;
}
declare const Linking: LinkingImpl;
/**
 * `Linking` gives you a general interface to interact with both incoming
 * and outgoing app links.
 *
 * See https://reactnative.dev/docs/linking
 */
declare const $$Linking: typeof Linking;
declare type $$Linking = typeof $$Linking;
export default $$Linking;
