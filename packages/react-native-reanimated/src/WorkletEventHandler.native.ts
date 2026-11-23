'use strict';
import { registerEventHandler, unregisterEventHandler } from './core';
import type { IWorkletEventHandler, ReanimatedEvent } from './hook/commonTypes';

type RegistrationIdsByFallback = Map<string | undefined, number[]>;

export class WorkletEventHandler<
  Event extends object,
> implements IWorkletEventHandler<Event> {
  eventNames: string[];
  worklet: (event: ReanimatedEvent<Event>) => void;
  #registrationsByViewTag: Map<number, RegistrationIdsByFallback>;
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[]
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.#registrationsByViewTag = new Map();
  }

  updateEventHandler(
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[]
  ): void {
    this.worklet = newWorklet;
    this.eventNames = newEvents;

    for (const [viewTag, idsByFallback] of this.#registrationsByViewTag) {
      for (const [fallbackEventName, ids] of idsByFallback) {
        ids.forEach((id) => unregisterEventHandler(id));
        idsByFallback.set(
          fallbackEventName,
          this.#register(viewTag, fallbackEventName)
        );
      }
    }
  }

  registerForEvents(viewTag: number, fallbackEventName?: string): void {
    const idsByFallback: RegistrationIdsByFallback =
      this.#registrationsByViewTag.get(viewTag) ?? new Map();
    idsByFallback.set(
      fallbackEventName,
      this.#register(viewTag, fallbackEventName)
    );
    this.#registrationsByViewTag.set(viewTag, idsByFallback);
  }

  unregisterFromEvents(viewTag: number, fallbackEventName?: string): void {
    const idsByFallback = this.#registrationsByViewTag.get(viewTag);
    idsByFallback?.get(fallbackEventName)?.forEach((id) => {
      unregisterEventHandler(id);
    });
    idsByFallback?.delete(fallbackEventName);
    if (idsByFallback?.size === 0) {
      this.#registrationsByViewTag.delete(viewTag);
    }
  }

  #register(viewTag: number, fallbackEventName?: string): number[] {
    const eventNames =
      this.eventNames.length > 0 || !fallbackEventName
        ? this.eventNames
        : [fallbackEventName];
    return eventNames.map((eventName) =>
      registerEventHandler(this.worklet, eventName, viewTag)
    );
  }
}
