/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<ae5394dd6683b0842d5525530aa319ed>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/vendor/emitter/EventEmitter.js
 */

type UnsafeObject = Object;
export interface EventSubscription {
  remove(): void;
}
export interface IEventEmitter<TEventToArgsMap extends Readonly<Record<string, ReadonlyArray<UnsafeObject>>>> {
  addListener<TEvent extends keyof TEventToArgsMap>(eventType: TEvent, listener: (...args: TEventToArgsMap[TEvent]) => unknown, context?: unknown): EventSubscription;
  emit<TEvent extends keyof TEventToArgsMap>(eventType: TEvent, ...args: TEventToArgsMap[TEvent]): void;
  removeAllListeners<TEvent extends keyof TEventToArgsMap>(eventType?: TEvent | undefined): void;
  listenerCount<TEvent extends keyof TEventToArgsMap>(eventType: TEvent): number;
}
/**
 * EventEmitter manages listeners and publishes events to them.
 *
 * EventEmitter accepts a single type parameter that defines the valid events
 * and associated listener argument(s).
 *
 * @example
 *
 *   const emitter = new EventEmitter<{
 *     success: [number, string],
 *     error: [Error],
 *   }>();
 *
 *   emitter.on('success', (statusCode, responseText) => {...});
 *   emitter.emit('success', 200, '...');
 *
 *   emitter.on('error', error => {...});
 *   emitter.emit('error', new Error('Resource not found'));
 *
 */
declare class EventEmitter<TEventToArgsMap extends Readonly<Record<string, ReadonlyArray<UnsafeObject>>> = Readonly<Record<string, ReadonlyArray<UnsafeObject>>>> implements IEventEmitter<TEventToArgsMap> {
  constructor();
  addListener<TEvent extends keyof TEventToArgsMap>(eventType: TEvent, listener: (...args: TEventToArgsMap[TEvent]) => unknown, context: unknown): EventSubscription;
  emit<TEvent extends keyof TEventToArgsMap>(eventType: TEvent, ...args: TEventToArgsMap[TEvent]): void;
  removeAllListeners<TEvent extends keyof TEventToArgsMap>(eventType?: null | undefined | TEvent): void;
  listenerCount<TEvent extends keyof TEventToArgsMap>(eventType: TEvent): number;
}
export default EventEmitter;
