'use strict';
import { IS_JEST } from './common';
import { WorkletEventHandlerWeb } from './commonWorkletEventHandler';
import { registerEventHandler, unregisterEventHandler } from './core';
import type { IWorkletEventHandler, ReanimatedEvent } from './hook/commonTypes';

class WorkletEventHandlerNative<
  Event extends object,
> implements IWorkletEventHandler<Event> {
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

export const WorkletEventHandler = IS_JEST
  ? WorkletEventHandlerWeb
  : WorkletEventHandlerNative;
