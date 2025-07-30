/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<189cd79b3349ddc6b933b5b9616b6e73>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Core/RawEventEmitter.js
 */

import type { IEventEmitter } from "../vendor/emitter/EventEmitter";
export type RawEventEmitterEvent = Readonly<{
  eventName: string;
  nativeEvent: {
    [$$Key$$: string]: unknown;
  };
}>;
type RawEventDefinitions = {
  [eventChannel: string]: [RawEventEmitterEvent];
};
declare const RawEventEmitter: IEventEmitter<RawEventDefinitions>;
declare const $$RawEventEmitter: typeof RawEventEmitter;
declare type $$RawEventEmitter = typeof $$RawEventEmitter;
export default $$RawEventEmitter;
