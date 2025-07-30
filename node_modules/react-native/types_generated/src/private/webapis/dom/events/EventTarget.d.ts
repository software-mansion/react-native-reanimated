/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<bed774109e4b07944ca23fa897fcfb09>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/events/EventTarget.js
 */

import Event from "./Event";
export type EventCallback = (event: Event) => void;
export type EventHandler = {
  handleEvent(event: Event): void;
};
export type EventListener = EventCallback | EventHandler;
export type EventListenerOptions = Readonly<{
  capture?: boolean;
}>;
export type AddEventListenerOptions = Readonly<Omit<EventListenerOptions, keyof {
  passive?: boolean;
  once?: boolean;
  signal?: AbortSignal;
}> & {
  passive?: boolean;
  once?: boolean;
  signal?: AbortSignal;
}>;
declare class EventTarget {
  addEventListener(type: string, callback: EventListener | null, optionsOrUseCapture?: AddEventListenerOptions | boolean): void;
  removeEventListener(type: string, callback: EventListener, optionsOrUseCapture?: EventListenerOptions | boolean): void;
  dispatchEvent(event: Event): boolean;
  EVENT_TARGET_GET_THE_PARENT_KEY(): EventTarget | null;
  INTERNAL_DISPATCH_METHOD_KEY(event: Event): void;
}
export default EventTarget;
