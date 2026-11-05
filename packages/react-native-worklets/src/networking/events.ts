'use strict';

import type { Blob } from './Blob';

interface NetworkingEvent {
  type: string;
  target: EventTargetLite;
  currentTarget: EventTargetLite;
  loaded: number;
  total: number;
  lengthComputable: boolean;
  message?: string;
  data?: string | ArrayBuffer | Blob;
  origin?: string;
  lastEventId?: string;
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

export type NetworkingEventListener = (event: NetworkingEvent) => void;

type EventListenerOptions = {
  once?: boolean;
  signal?: AbortSignalLite;
};

type AbortSignalLite = {
  aborted: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
};

type Registration = {
  listener: NetworkingEventListener;
  once: boolean;
  removed: boolean;
  detachAbort?: () => void;
};

export class EventTargetLite {
  private eventListeners = new Map<string, Registration[]>();
  private handlerRegistrations = new Map<string, Registration>();
  private handlers = new Map<string, NetworkingEventListener>();

  addEventListener(
    type: string,
    listener: NetworkingEventListener,
    options?: EventListenerOptions | boolean
  ) {
    if (typeof listener !== 'function') {
      return;
    }
    const resolved =
      typeof options === 'object' && options !== null ? options : {};
    if (resolved.signal?.aborted === true) {
      return;
    }
    let listeners = this.eventListeners.get(type);
    if (listeners === undefined) {
      listeners = [];
      this.eventListeners.set(type, listeners);
    }
    if (listeners.some((entry) => entry.listener === listener)) {
      return;
    }
    const registration: Registration = {
      listener,
      once: resolved.once === true,
      removed: false,
    };
    listeners.push(registration);
    const signal = resolved.signal;
    if (signal !== undefined) {
      const onAbort = () => this.removeRegistration(type, registration);
      signal.addEventListener('abort', onAbort);
      registration.detachAbort = () =>
        signal.removeEventListener?.('abort', onAbort);
    }
  }

  removeEventListener(type: string, listener: NetworkingEventListener) {
    const registration = this.eventListeners
      .get(type)
      ?.find((entry) => entry.listener === listener);
    if (registration !== undefined) {
      this.removeRegistration(type, registration);
    }
  }

  private removeRegistration(type: string, registration: Registration) {
    const listeners = this.eventListeners.get(type);
    if (listeners === undefined) {
      return;
    }
    const index = listeners.indexOf(registration);
    if (index !== -1) {
      registration.removed = true;
      listeners.splice(index, 1);
      registration.detachAbort?.();
    }
  }

  /**
   * https://html.spec.whatwg.org/multipage/webappapis.html#event-handlers - an
   * `on<type>` handler joins the listener list at the moment it is first
   * assigned, so a listener registered before it still runs first. Subclasses
   * declare their handler names so the accessors can enforce that.
   */
  protected __getHandler(type: string): NetworkingEventListener | null {
    return this.handlers.get(type) ?? null;
  }

  protected __setHandler(type: string, value: NetworkingEventListener | null) {
    const next = typeof value === 'function' ? value : null;
    const existing = this.handlerRegistrations.get(type);
    if (next === null) {
      this.handlers.delete(type);
      if (existing !== undefined) {
        this.removeRegistration(type, existing);
        this.handlerRegistrations.delete(type);
      }
      return;
    }
    this.handlers.set(type, next);
    if (existing !== undefined) {
      return;
    }
    const registration: Registration = {
      listener: (event) => this.handlers.get(type)?.call(this, event),
      once: false,
      removed: false,
    };
    this.handlerRegistrations.set(type, registration);
    let listeners = this.eventListeners.get(type);
    if (listeners === undefined) {
      listeners = [];
      this.eventListeners.set(type, listeners);
    }
    listeners.push(registration);
  }

  /**
   * Subclasses that keep their handlers as plain properties are dispatched the
   * old way: the handler runs first, then the registered listeners.
   */
  private __plainHandler(type: string): NetworkingEventListener | undefined {
    if (this.handlerRegistrations.has(type)) {
      return undefined;
    }
    const handler = (this as unknown as Record<string, unknown>)[`on${type}`];
    return typeof handler === 'function'
      ? (handler as NetworkingEventListener)
      : undefined;
  }

  __dispatch(type: string, extra?: Partial<NetworkingEvent>) {
    const event: NetworkingEvent = {
      type,
      target: this,
      currentTarget: this,
      loaded: 0,
      total: 0,
      lengthComputable: false,
      ...extra,
    };
    const plainHandler = this.__plainHandler(type);
    if (plainHandler !== undefined) {
      this.invokeListener(plainHandler, event);
    }
    const listeners = this.eventListeners.get(type);
    if (listeners === undefined) {
      return;
    }
    for (const entry of Array.from(listeners)) {
      if (entry.removed) {
        continue;
      }
      if (entry.once) {
        this.removeRegistration(type, entry);
      }
      this.invokeListener(entry.listener, event);
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
