'use strict';

import type { CSSAnimationEventType } from '../../types';

type CSSEventType = CSSAnimationEventType; // TODO - add CSS transition events support

type CSSAnimationEventPayload = {
  viewTag: number;
  type: CSSAnimationEventType;
  animationName: string;
  elapsedTime: number;
};

type CSSEventPayload = CSSAnimationEventPayload;

type CSSEventHandler = (event: CSSEventPayload) => void;

type CSSEventHandlersMap = {
  [K in CSSEventType]?: CSSEventHandler;
};

/**
 * Singleton registry that stores CSS event handlers (e.g. onAnimationStart,
 * onAnimationEnd) per view and event type. C++ dispatches batched events to the
 * `handleEvents` method, which routes each event to the correct handler.
 */
class CSSEventHandlersRegistry {
  private readonly handlers_: Map<number, CSSEventHandlersMap> = new Map();

  setListeners(viewTag: number, handlers: CSSEventHandlersMap): void {
    if (Object.keys(handlers).length === 0) {
      this.handlers_.delete(viewTag);
      return;
    }
    this.handlers_.set(viewTag, handlers);
  }

  clearListeners(viewTag: number): void {
    this.handlers_.delete(viewTag);
  }

  /**
   * Called from C++ via jsInvoker with a batch of events. Routes each event to
   * the registered handler for its view + type.
   */
  handleEvents(events: CSSEventPayload[]): void {
    for (const event of events) {
      this.handlers_.get(event.viewTag)?.[event.type]?.(event);
    }
  }

  clear(): void {
    this.handlers_.clear();
  }
}

const cssEventHandlersRegistry = new CSSEventHandlersRegistry();

export default cssEventHandlersRegistry;
