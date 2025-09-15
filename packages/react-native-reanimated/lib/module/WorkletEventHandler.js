'use strict';

import { SHOULD_BE_USE_WEB } from './common';
import { registerEventHandler, unregisterEventHandler } from './core';
// In JS implementation (e.g. for web) we don't use Reanimated's
// event emitter, therefore we have to handle here
// the event that came from React Native and convert it.
function jsListener(eventName, handler) {
  return evt => {
    handler({
      ...evt.nativeEvent,
      eventName
    });
  };
}
class WorkletEventHandlerNative {
  #viewTags;
  #registrations; // keys are viewTags, values are arrays of registration ID's for each viewTag
  constructor(worklet, eventNames) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.#viewTags = new Set();
    this.#registrations = new Map();
  }
  updateEventHandler(newWorklet, newEvents) {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;

    // Detach all events
    this.#registrations.forEach(registrationIDs => {
      registrationIDs.forEach(id => unregisterEventHandler(id));
      // No need to remove registrationIDs from map, since it gets overwritten when attaching
    });

    // Attach new events with new worklet
    Array.from(this.#viewTags).forEach(tag => {
      const newRegistrations = this.eventNames.map(eventName => registerEventHandler(this.worklet, eventName, tag));
      this.#registrations.set(tag, newRegistrations);
    });
  }
  registerForEvents(viewTag, fallbackEventName) {
    this.#viewTags.add(viewTag);
    const newRegistrations = this.eventNames.map(eventName => registerEventHandler(this.worklet, eventName, viewTag));
    this.#registrations.set(viewTag, newRegistrations);
    if (this.eventNames.length === 0 && fallbackEventName) {
      const newRegistration = registerEventHandler(this.worklet, fallbackEventName, viewTag);
      this.#registrations.set(viewTag, [newRegistration]);
    }
  }
  unregisterFromEvents(viewTag) {
    this.#viewTags.delete(viewTag);
    this.#registrations.get(viewTag)?.forEach(id => {
      unregisterEventHandler(id);
    });
    this.#registrations.delete(viewTag);
  }
}
class WorkletEventHandlerWeb {
  constructor(worklet, eventNames = []) {
    this.worklet = worklet;
    this.eventNames = eventNames;
    this.listeners = {};
    this.setupWebListeners();
  }
  setupWebListeners() {
    this.listeners = {};
    this.eventNames.forEach(eventName => {
      this.listeners[eventName] = jsListener(eventName, this.worklet);
    });
  }
  updateEventHandler(newWorklet, newEvents) {
    // Update worklet and event names
    this.worklet = newWorklet;
    this.eventNames = newEvents;
    this.setupWebListeners();
  }
  registerForEvents(_viewTag, _fallbackEventName) {
    // noop
  }
  unregisterFromEvents(_viewTag) {
    // noop
  }
}
export const WorkletEventHandler = SHOULD_BE_USE_WEB ? WorkletEventHandlerWeb : WorkletEventHandlerNative;
//# sourceMappingURL=WorkletEventHandler.js.map