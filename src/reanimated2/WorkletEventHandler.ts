'use strict';
import type { NativeSyntheticEvent } from 'react-native';
import { registerEventHandler, unregisterEventHandler } from './core';
import type {
  EventPayload,
  ReanimatedEvent,
  IWorkletEventHandler,
} from './hook/commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

type EventHandlerRegistration = {
  id: number;
  viewTag: number;
};

class WorkletEventHandlerNative<Event extends object>
  implements IWorkletEventHandler<Event>
{
  worklet: (event: ReanimatedEvent<Event>) => void;
  eventNames: string[];
  viewTags: Set<number>;
  registrations: EventHandlerRegistration[];
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[] = []
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.viewTags = new Set<number>();
    this.registrations = [];
  }

  updateEventHandler(
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[]
  ): void {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;

    // Detach all events
    this.registrations.forEach((registration) => {
      unregisterEventHandler(registration.id);
    });
    this.registrations = [];

    // Attach new events with new worklet
    this.registrations = this.eventNames.flatMap((eventName) => {
      return Array.from(this.viewTags).map((tag) => {
        return {
          id: registerEventHandler(this.worklet, eventName, tag),
          viewTag: tag,
        };
      });
    });
  }

  registerForEvents(viewTag: number, fallbackEventName?: string): void {
    this.viewTags.add(viewTag);

    this.registrations = this.registrations.concat(
      this.eventNames.map((eventName) => {
        return {
          id: registerEventHandler(this.worklet, eventName, viewTag),
          viewTag,
        };
      })
    );

    if (this.eventNames.length === 0 && fallbackEventName) {
      this.registrations.push({
        id: registerEventHandler(this.worklet, fallbackEventName, viewTag),
        viewTag,
      });
    }
  }

  unregisterFromEvents(viewTag: number): void {
    this.viewTags.delete(viewTag);
    this.registrations.forEach((registration) => {
      if (registration.viewTag === viewTag) {
        unregisterEventHandler(registration.id);
      }
    });
  }
}

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

class WorkletEventHandlerWeb<Event extends object>
  implements IWorkletEventHandler<Event>
{
  worklet: (event: ReanimatedEvent<Event>) => void;
  eventNames: string[];
  listeners:
    | Record<string, (event: ReanimatedEvent<ReanimatedEvent<Event>>) => void>
    | Record<string, (event: JSEvent<Event>) => void>;

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
    this.listeners = this.eventNames.reduce(
      (
        acc: Record<string, (event: JSEvent<Event>) => void>,
        eventName: string
      ) => {
        acc[eventName] = jsListener(eventName, this.worklet);
        return acc;
      },
      {}
    );
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
