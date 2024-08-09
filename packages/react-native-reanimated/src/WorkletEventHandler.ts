'use strict';
import { registerEventHandler, unregisterEventHandler } from './core';
import type {
  ReanimatedEvent,
  IWorkletEventHandler,
  JSEvent,
  ReactEventHandler,
} from './hook/commonTypes';
import { shouldBeUseWeb } from './PlatformChecker';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

// In JS implementation (e.g. for web) we don't use Reanimated's
// event emitter, therefore we have to handle here
// the event that came from React Native and convert it.
function jsListener<Event extends object>(
  eventName: string,
  workletHandler: (event: ReanimatedEvent<Event>) => void,
  reactHandler: ReactEventHandler<Event>
): (evt: JSEvent<Event>) => void;
function jsListener<Event extends object>(
  eventName: string,
  workletHandler: (event: ReanimatedEvent<Event>) => void
): (evt: JSEvent<Event>) => void;
function jsListener<Event extends object>(
  eventName: string,
  reactHandler: ReactEventHandler<Event>
): (evt: JSEvent<Event>) => void;

function jsListener<Event extends object>(
  eventName: string,
  workletHandler?: (event: ReanimatedEvent<Event>) => void,
  reactHandler?: ReactEventHandler<Event>
) {
  return (evt: JSEvent<Event>) => {
    workletHandler &&
      workletHandler({
        ...evt.nativeEvent,
        eventName,
      } as ReanimatedEvent<Event>);
    reactHandler && reactHandler(evt);
  };
}

class WorkletEventHandlerNative<Event extends object>
  implements IWorkletEventHandler<Event>
{
  eventNames: string[];
  worklet: (event: ReanimatedEvent<Event>) => void;
  reactHandlers: Record<string, ReactEventHandler<Event>>; // for native platforms we just need to keep them so PropFilter sets them to props
  #viewTags: Set<number>;
  #registrations: Map<number, number[]>; // keys are viewTags, values are arrays of registration ID's for each viewTag
  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[],
    reactHandlers: Record<string, ReactEventHandler<Event>>
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.reactHandlers = reactHandlers;
    this.#viewTags = new Set<number>();
    this.#registrations = new Map<number, number[]>();
  }

  updateEventHandler(
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[],
    newReactHandlers: Record<string, ReactEventHandler<Event>>
  ): void {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;
    this.reactHandlers = newReactHandlers;

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

  reactHandlers: Record<string, ReactEventHandler<Event>>; // web react Handlers need to be merged with Worklet handlers
  worklet: (event: ReanimatedEvent<Event>) => void;

  constructor(
    worklet: (event: ReanimatedEvent<Event>) => void,
    eventNames: string[] = [],
    reactHandlers: Record<string, ReactEventHandler<Event>>
  ) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.reactHandlers = reactHandlers;
    this.listeners = {};
    this.setupWebListeners();
  }

  setupWebListeners() {
    this.listeners = {};

    const eventsFromReactHandlers = Object.keys(this.reactHandlers);

    // events that are both from react and worklet handlers
    const sharedEvents = eventsFromReactHandlers.filter((value) =>
      this.eventNames.includes(value)
    );

    // events from only worklet handlers
    const restWorkletEvents = this.eventNames.filter(
      (value) => !eventsFromReactHandlers.includes(value)
    );

    // events from only react handlers
    const restReactEvents = eventsFromReactHandlers.filter(
      (value) => !this.eventNames.includes(value)
    );

    // shared events get react and worklet handlers merged into a listener to put into a prop
    sharedEvents.forEach((eventName) => {
      this.listeners[eventName] = jsListener(
        eventName,
        this.worklet,
        this.reactHandlers[eventName]
      );
    });

    // only worklet events get their own listeners
    restWorkletEvents.forEach((eventName) => {
      this.listeners[eventName] = jsListener(eventName, this.worklet);
    });

    // only react events get their own listeners
    restReactEvents.forEach((eventName) => {
      this.listeners[eventName] = jsListener(
        eventName,
        this.reactHandlers[eventName]
      );
    });
  }

  updateEventHandler(
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[],
    newReactHandlers: Record<string, ReactEventHandler<Event>>
  ): void {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;
    this.reactHandlers = newReactHandlers;
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
