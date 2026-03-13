'use strict';

export type CSSAnimationEventType =
  | 'animationstart'
  | 'animationend'
  | 'animationiteration';

type CSSEventType = CSSAnimationEventType; // TODO - add CSS transition events support

type CSSAnimationEventPayload = {
  viewTag: number;
  type: CSSAnimationEventType;
  animationName: string;
  elapsedTime: number;
};

type CSSEventPayload = CSSAnimationEventPayload;

type CSSEventHandler = (event: CSSEventPayload) => void;

type ViewEventHandlers = Map<CSSEventType, CSSEventHandler>;

/**
 * Singleton registry that stores CSS event handlers (e.g. onAnimationStart,
 * onAnimationEnd) per view and event type. C++ dispatches batched events to the
 * `handleEvents` method, which routes each event to the correct handler.
 */
class CSSEventHandlersRegistry {
  private readonly handlers_: Map<number, ViewEventHandlers> = new Map();

  addListener(
    viewTag: number,
    eventType: CSSEventType,
    handler: CSSEventHandler
  ): void {
    let viewHandlers = this.handlers_.get(viewTag);
    if (!viewHandlers) {
      viewHandlers = new Map();
      this.handlers_.set(viewTag, viewHandlers);
    }
    viewHandlers.set(eventType, handler);
  }

  removeListener(viewTag: number, eventType: CSSEventType): void {
    const viewHandlers = this.handlers_.get(viewTag);
    if (!viewHandlers) {
      return;
    }
    viewHandlers.delete(eventType);
    if (viewHandlers.size === 0) {
      this.handlers_.delete(viewTag);
    }
  }

  /**
   * Called from C++ via jsInvoker with a batch of events. Routes each event to
   * the registered handler for its view + type.
   */
  handleEvents(events: CSSEventPayload[]): void {
    for (const event of events) {
      this.handlers_.get(event.viewTag)?.get(event.type)?.(event);
    }
  }

  clear(): void {
    this.handlers_.clear();
  }
}

const cssEventHandlersRegistry = new CSSEventHandlersRegistry();

export default cssEventHandlersRegistry;
