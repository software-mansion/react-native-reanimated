'use strict';
import { registerEventHandler, unregisterEventHandler } from './core';
import type { IWorkletEventHandler, ReanimatedEvent } from './hook/commonTypes';

export class WorkletEventHandler<
  Event extends object,
> implements IWorkletEventHandler<Event> {
  readonly eventNames: string[];
  readonly worklet: (event: ReanimatedEvent<Event>) => void;
  #registrations: Map<number, number[]>; // keys are viewTags, values are arrays of registration ID's for each viewTag
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[]
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.#registrations = new Map<number, number[]>();
  }

  registerForEvents(viewTag: number, fallbackEventName?: string): void {
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
    this.#registrations.get(viewTag)?.forEach((id) => {
      unregisterEventHandler(id);
    });
    this.#registrations.delete(viewTag);
  }
}
