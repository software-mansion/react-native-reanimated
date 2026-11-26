'use strict';
import { registerEventHandler, unregisterEventHandler } from './core';
import type { IWorkletEventHandler, ReanimatedEvent } from './hook/commonTypes';

export class WorkletEventHandler<
  Event extends object,
> implements IWorkletEventHandler<Event> {
  readonly eventNames: string[];
  readonly worklet: (event: ReanimatedEvent<Event>) => void;
  #registrations: Map<ViewTag, Map<EventName, RegistrationId>>;
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[]
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.#registrations = new Map();
  }

  registerForEvents(viewTag: number, fallbackEventName?: string): void {
    const registrations =
      this.#registrations.get(viewTag) ?? new Map<EventName, RegistrationId>();
    this.#registrations.set(viewTag, registrations);

    const eventNames = eventNamesToRegister(this.eventNames, fallbackEventName);
    for (const eventName of eventNames) {
      if (!registrations.has(eventName)) {
        registrations.set(
          eventName,
          registerEventHandler(this.worklet, eventName, viewTag)
        );
      }
    }
  }

  unregisterFromEvents(viewTag: number): void {
    this.#registrations.get(viewTag)?.forEach((id) => {
      unregisterEventHandler(id);
    });
    this.#registrations.delete(viewTag);
  }
}

function eventNamesToRegister(
  eventNames: string[],
  fallbackEventName?: string
): string[] {
  if (eventNames.length > 0) {
    return eventNames;
  }
  return fallbackEventName ? [fallbackEventName] : [];
}

type ViewTag = number;
type EventName = string;
type RegistrationId = number;
