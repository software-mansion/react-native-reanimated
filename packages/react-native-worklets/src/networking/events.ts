'use strict';

export interface NetworkingEvent {
  type: string;
  target: EventTargetLite;
  loaded: number;
  total: number;
  lengthComputable: boolean;
  message?: string;
}

export type NetworkingEventListener = (event: NetworkingEvent) => void;

export class EventTargetLite {
  private eventListeners = new Map<string, Set<NetworkingEventListener>>();

  addEventListener(type: string, listener: NetworkingEventListener) {
    let listeners = this.eventListeners.get(type);
    if (listeners === undefined) {
      listeners = new Set();
      this.eventListeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  removeEventListener(type: string, listener: NetworkingEventListener) {
    this.eventListeners.get(type)?.delete(listener);
  }

  __dispatch(type: string, extra?: Partial<NetworkingEvent>) {
    const event: NetworkingEvent = {
      type,
      target: this,
      loaded: 0,
      total: 0,
      lengthComputable: false,
      ...extra,
    };
    const handler = (this as unknown as Record<string, unknown>)[`on${type}`];
    if (typeof handler === 'function') {
      this.invokeListener(handler as NetworkingEventListener, event);
    }
    const listeners = this.eventListeners.get(type);
    if (listeners !== undefined) {
      for (const listener of Array.from(listeners)) {
        this.invokeListener(listener, event);
      }
    }
  }

  private invokeListener(
    listener: NetworkingEventListener,
    event: NetworkingEvent
  ) {
    try {
      listener.call(this, event);
    } catch (error) {
      console.error(error);
    }
  }
}
