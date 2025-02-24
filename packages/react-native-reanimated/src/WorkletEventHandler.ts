'use strict';
import type { NativeSyntheticEvent } from 'react-native';

import { registerEventHandler, unregisterEventHandler } from './core';
import type {
  EventPayload,
  IWorkletEventHandler,
  ReanimatedEvent,
} from './hook/commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

type JSEvent<Event extends object> = NativeSyntheticEvent<EventPayload<Event>>;

// In JS implementation (e.g. for web) we don't use Reanimated's
// event emitter, therefore we have to handle here
// the event that came from React Native and convert it.
function jsListener<Event extends object>(
  eventName: string,
  handler: (event: ReanimatedEvent<Event>) => void
) {
  return (evt: JSEvent<Event>) => {
    handler({ ...evt.nativeEvent, eventName } as ReanimatedEvent<Event>);
  };
}

class WorkletEventHandlerNative<Event extends object>
  implements IWorkletEventHandler<Event>
{
  eventNames: string[];
  worklet: (event: ReanimatedEvent<Event>) => void;
  #viewTags: Set<number>;
  #registrations: Map<number, number[]>; // keys are viewTags, values are arrays of registration ID's for each viewTag
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[]
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.#viewTags = new Set<number>();
    this.#registrations = new Map<number, number[]>();
  }

  updateEventHandler(
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[]
  ): void {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;

    // Detach all events
    this.#registrations.forEach((registrationIDs) => {
      registrationIDs.forEach((id) => unregisterEventHandler(id));
      // No need to remove registrationIDs from map, since it gets overwritten when attaching
    });

    // Attach new events with new worklet
    Array.from(this.#viewTags).forEach((tag) => {
      const newRegistrations = this.eventNames.map((eventName) =>
        registerEventHandler(this.worklet, eventName, tag)
      );
      this.#registrations.set(tag, newRegistrations);
    });
  }

  registerForEvents(viewTag: number, fallbackEventName?: string): void {
    this.#viewTags.add(viewTag);

    const newRegistrations = this.eventNames.map((eventName) =>
      registerEventHandler(this.worklet, eventName, viewTag)
    );
    this.#registrations.set(viewTag, newRegistrations);

    if (this.eventNames.length === 0 && fallbackEventName) {
      const newRegistration = registerEventHandler(
        this.worklet,
        fallbackEventName,
        viewTag
      );
      this.#registrations.set(viewTag, [newRegistration]);
    }
  }

  unregisterFromEvents(viewTag: number): void {
    this.#viewTags.delete(viewTag);
    this.#registrations.get(viewTag)?.forEach((id) => {
      unregisterEventHandler(id);
    });
    this.#registrations.delete(viewTag);
  }
}

class WorkletEventHandlerWeb<Event extends object>
  implements IWorkletEventHandler<Event>
{
  eventNames: string[];
  listeners:
    | Record<string, (event: ReanimatedEvent<ReanimatedEvent<Event>>) => void>
    | Record<string, (event: JSEvent<Event>) => void>;

  worklet: (event: ReanimatedEvent<Event>) => void;

  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[] = []
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.listeners = {};
    this.setupWebListeners();
  }

  setupWebListeners() {
    this.listeners = {};
    this.eventNames.forEach((eventName) => {
      this.listeners[eventName] = jsListener(eventName, this.worklet);
    });
  }

  updateEventHandler(
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[]
  ): void {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;
    this.setupWebListeners();
  }

  registerForEvents(_viewTag: number, _fallbackEventName?: string): void {
    // noop
  }

  unregisterFromEvents(_viewTag: number): void {
    // noop
  }
}

export const WorkletEventHandler = SHOULD_BE_USE_WEB
  ? WorkletEventHandlerWeb
  : WorkletEventHandlerNative;
