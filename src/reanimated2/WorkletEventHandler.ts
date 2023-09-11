import NativeReanimatedModule from './NativeReanimated';
import { registerEventHandler, unregisterEventHandler } from './core';
import type { RNEvent, ReanimatedEvent } from './hook/commonTypes';

function jsListener<Payload extends object>(
  eventName: string,
  handler: (event: ReanimatedEvent<Payload>) => void
) {
  return (evt: RNEvent<Payload>) => {
    handler({ ...evt.nativeEvent, eventName });
  };
}

export default class WorkletEventHandler<Payload extends object> {
  worklet: (event: ReanimatedEvent<Payload>) => void;
  eventNames: string[];
  reattachNeeded: boolean;
  listeners:
    | Record<string, (event: ReanimatedEvent<ReanimatedEvent<Payload>>) => void>
    | Record<string, (event: RNEvent<Payload>) => void>;

  viewTag: number | undefined;
  registrations: number[];
  constructor(
    worklet: (event: ReanimatedEvent<Payload>) => void,
    eventNames: string[] = []
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.reattachNeeded = false;
    this.listeners = {};
    this.viewTag = undefined;
    this.registrations = [];

    if (!NativeReanimatedModule.native) {
      this.listeners = eventNames.reduce(
        (
          acc: Record<string, (event: RNEvent<Payload>) => void>,
          eventName: string
        ) => {
          acc[eventName] = jsListener(eventName, worklet);
          return acc;
        },
        {}
      );
    }
  }

  updateWorklet(newWorklet: (event: ReanimatedEvent<Payload>) => void): void {
    this.worklet = newWorklet;
    this.reattachNeeded = true;
  }

  registerForEvents(viewTag: number, fallbackEventName?: string): void {
    this.viewTag = viewTag;
    this.registrations = this.eventNames.map((eventName) =>
      registerEventHandler(this.worklet, eventName, viewTag)
    );
    if (this.registrations.length === 0 && fallbackEventName) {
      this.registrations.push(
        registerEventHandler(this.worklet, fallbackEventName, viewTag)
      );
    }
  }

  registerForEventByName(eventName: string) {
    this.registrations.push(registerEventHandler(this.worklet, eventName));
  }

  unregisterFromEvents(): void {
    this.registrations.forEach((id) => unregisterEventHandler(id));
    this.registrations = [];
  }
}
