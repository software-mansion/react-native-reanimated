/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<84337174fd0b984be51e9d76317f61d5>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/EventEmitter/NativeEventEmitter.js
 */

import type { EventSubscription, IEventEmitter } from "../vendor/emitter/EventEmitter";
interface NativeModule {
  addListener(eventType: string): void;
  removeListeners(count: number): void;
}
/** @deprecated Use `EventSubscription` instead. */
/** @deprecated Use `EventSubscription` instead. */
type EmitterSubscription = EventSubscription;
export type { EventSubscription, EmitterSubscription };
/** @deprecated Use `EventSubscription` instead. */
export type NativeEventSubscription = EventSubscription;
type UnsafeObject = Object;
/**
 * `NativeEventEmitter` is intended for use by Native Modules to emit events to
 * JavaScript listeners. If a `NativeModule` is supplied to the constructor, it
 * will be notified (via `addListener` and `removeListeners`) when the listener
 * count changes to manage "native memory".
 *
 * Currently, all native events are fired via a global `RCTDeviceEventEmitter`.
 * This means event names must be globally unique, and it means that call sites
 * can theoretically listen to `RCTDeviceEventEmitter` (although discouraged).
 */
declare class NativeEventEmitter<TEventToArgsMap extends Readonly<Record<string, ReadonlyArray<UnsafeObject>>> = Readonly<Record<string, ReadonlyArray<UnsafeObject>>>> implements IEventEmitter<TEventToArgsMap> {
  constructor(nativeModule?: null | undefined | NativeModule);
  addListener<TEvent extends keyof TEventToArgsMap>(eventType: TEvent, listener: (...args: TEventToArgsMap[TEvent]) => unknown, context?: unknown): EventSubscription;
  emit<TEvent extends keyof TEventToArgsMap>(eventType: TEvent, ...args: TEventToArgsMap[TEvent]): void;
  removeAllListeners<TEvent extends keyof TEventToArgsMap>(eventType?: null | undefined | TEvent): void;
  listenerCount<TEvent extends keyof TEventToArgsMap>(eventType: TEvent): number;
}
export default NativeEventEmitter;
