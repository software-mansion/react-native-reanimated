import type { NativeEvent } from './commonTypes';
import NativeReanimatedModule from './NativeReanimated';
import { registerEventHandler, unregisterEventHandler } from './core';

function jsListener<T extends NativeEvent<T>>(
  eventName: string,
  handler: (event: T) => void
) {
  return (evt: T) => {
    handler({ ...evt.nativeEvent, eventName });
  };
}

export default class WorkletEventHandler<T extends NativeEvent<T>> {
  worklet: (event: T) => void;
  eventNames: string[];
  reattachNeeded: boolean;
  listeners: Record<string, (event: T) => void>;
  viewTag: number | undefined;
  registrations: number[];
  constructor(worklet: (event: T) => void, eventNames: string[] = []) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.reattachNeeded = false;
    this.listeners = {};
    this.viewTag = undefined;
    this.registrations = [];

    if (!NativeReanimatedModule.native) {
      this.listeners = eventNames.reduce(
        (acc: Record<string, (event: T) => void>, eventName: string) => {
          acc[eventName] = jsListener(eventName, worklet);
          return acc;
        },
        {}
      );
    }
  }

  updateWorklet(newWorklet: (event: T) => void): void {
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
