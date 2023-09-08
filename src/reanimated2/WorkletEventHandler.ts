import NativeReanimatedModule from './NativeReanimated';
import { registerEventHandler, unregisterEventHandler } from './core';
import type { NativeEvent, WrappedNativeEvent } from './hook/commonTypes';

function jsListener<Payload extends object>(
  eventName: string,
  handler: (event: NativeEvent<Payload>) => void
) {
  return (evt: WrappedNativeEvent<Payload>) => {
    handler({ ...evt.nativeEvent, eventName });
  };
}

export default class WorkletEventHandler<Payload extends object> {
  worklet: (event: NativeEvent<Payload>) => void;
  eventNames: string[];
  reattachNeeded: boolean;
  listeners: Record<string, (event: NativeEvent<Payload>) => void>;
  viewTag: number | undefined;
  registrations: number[];
  constructor(
    worklet: (event: NativeEvent<Payload>) => void,
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
          acc: Record<string, (event: WrappedNativeEvent<Payload>) => void>,
          eventName: string
        ) => {
          acc[eventName] = jsListener(eventName, worklet);
          return acc;
        },
        {}
        // TODO TYPESCRIPT
        // We do this cast because the types are a bit scuffed at the moment.
        // In Native implementation Events are just their Payload, but in
        // web they are wrapped in an object with a `nativeEvent` field.
      ) as Record<string, (event: NativeEvent<Payload>) => void>;
    }
  }

  updateWorklet(newWorklet: (event: NativeEvent<Payload>) => void): void {
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
