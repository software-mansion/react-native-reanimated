'use strict';
import { registerEventHandler, unregisterEventHandler } from './core';
import type {
  ReanimatedEvent,
  IWorkletEventHandler,
  JSEvent,
  JSHandler,
} from './hook/commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

// In JS implementation (e.g. for web) we don't use Reanimated's
// event emitter, therefore we have to handle here
// the event that came from React Native and convert it.
function jsListener<Event extends object>(
  eventName: string,
  handler?: (event: ReanimatedEvent<Event>) => void,
  handlerJS?: JSHandler<Event>
) {
  return (evt: JSEvent<Event>) => {
    if (handler) {
      handler({ ...evt.nativeEvent, eventName } as ReanimatedEvent<Event>);
    }
    if (handlerJS) {
      handlerJS(evt);
    }
  };
}

class WorkletEventHandlerNative<Event extends object>
  implements IWorkletEventHandler<Event>
{
  eventNames: string[];
  worklet: (event: ReanimatedEvent<Event>) => void;
  JSHandlers: Record<string, JSHandler<Event>>; // for native platforms we just need to keep them so PropFilter sets them to props
  #viewTags: Set<number>;
  #registrations: Map<number, number[]>; // keys are viewTags, values are arrays of registration ID's for each viewTag
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[],
    JSHandlers: Record<string, JSHandler<Event>>
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.JSHandlers = JSHandlers;
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

  JSHandlers: Record<string, JSHandler<Event>>; // web JS Handlers need to be merged with Worklet handlers
  worklet: (event: ReanimatedEvent<Event>) => void;

  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[] = [],
    JSHandlers: Record<string, JSHandler<Event>>
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.JSHandlers = JSHandlers;
    this.listeners = {};
    this.setupWebListeners();
  }

  setupWebListeners() {
    this.listeners = {};

    const eventsFromJSHandlers = Object.keys(this.JSHandlers);

    // events that are both from JS and Worklet handlers
    const sharedEvents = eventsFromJSHandlers.filter((value) =>
      this.eventNames.includes(value)
    );

    // events from only Worklet handlers
    const restWorkletEvents = this.eventNames.filter(
      (value) => !eventsFromJSHandlers.includes(value)
    );

    // events from only JS handlers
    const restJSEvents = eventsFromJSHandlers.filter(
      (value) => !this.eventNames.includes(value)
    );

    // shared events get JS and Worklet handlers merged into a listener to put into a prop
    sharedEvents.forEach((eventName) => {
      this.listeners[eventName] = jsListener(
        eventName,
        this.worklet,
        this.JSHandlers[eventName]
      );
    });

    // only Worklet events get their own listeners
    restWorkletEvents.forEach((eventName) => {
      this.listeners[eventName] = jsListener(eventName, this.worklet);
    });

    // only JS events get their own listeners
    restJSEvents.forEach((eventName) => {
      this.listeners[eventName] = jsListener(
        eventName,
        undefined,
        this.JSHandlers[eventName]
      );
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
