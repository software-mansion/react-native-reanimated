/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<87e86237e28388324d355f285655486f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/webapis/dom/events/Event.js
 */

/**
 * This module implements the `Event` interface from the DOM.
 * See https://dom.spec.whatwg.org/#interface-event.
 */

import type EventTarget from "./EventTarget";
export interface EventInit {
  readonly bubbles?: boolean;
  readonly cancelable?: boolean;
  readonly composed?: boolean;
}
declare class Event {
  static readonly NONE: 0;
  static readonly CAPTURING_PHASE: 1;
  static readonly AT_TARGET: 2;
  static readonly BUBBLING_PHASE: 3;
  readonly NONE: 0;
  readonly CAPTURING_PHASE: 1;
  readonly AT_TARGET: 2;
  readonly BUBBLING_PHASE: 3;
  COMPOSED_PATH_KEY: boolean;
  CURRENT_TARGET_KEY: EventTarget | null;
  EVENT_PHASE_KEY: boolean;
  IN_PASSIVE_LISTENER_FLAG_KEY: boolean;
  IS_TRUSTED_KEY: boolean;
  STOP_IMMEDIATE_PROPAGATION_FLAG_KEY: boolean;
  STOP_PROPAGATION_FLAG_KEY: boolean;
  TARGET_KEY: EventTarget | null;
  constructor(type: string, options?: null | undefined | EventInit);
  get bubbles(): boolean;
  get cancelable(): boolean;
  get composed(): boolean;
  get currentTarget(): EventTarget | null;
  get defaultPrevented(): boolean;
  get eventPhase(): EventPhase;
  get isTrusted(): boolean;
  get target(): EventTarget | null;
  get timeStamp(): number;
  get type(): string;
  composedPath(): ReadonlyArray<EventTarget>;
  preventDefault(): void;
  stopImmediatePropagation(): void;
  stopPropagation(): void;
}
export default Event;
export type EventPhase = (typeof Event)["NONE"] | (typeof Event)["CAPTURING_PHASE"] | (typeof Event)["AT_TARGET"] | (typeof Event)["BUBBLING_PHASE"];
