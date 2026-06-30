'use strict';
import type { NativeSyntheticEvent } from 'react-native';

import type {
  EventPayload,
  IWorkletEventHandler,
  ReanimatedEvent,
} from './hook/commonTypes';

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

class WorkletEventHandlerWeb<
  Event extends object,
> implements IWorkletEventHandler<Event> {
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

export const WorkletEventHandler = WorkletEventHandlerWeb;
