'use strict';
import type { CSSEventSubscriber, NativeCSSEvent } from './types';

/**
 * Routes CSS events emitted by the native side to the objects interested in a
 * given view. Nested animated components can share a view tag, so every tag
 * keeps a set of subscribers rather than a single one.
 */
class CSSCallbacksRegistry {
  private readonly subscribersByTag = new Map<
    number,
    Set<CSSEventSubscriber>
  >();

  /**
   * Unsubscribed views that still hear one batch, because the engine emits
   * their cancel as they tear down but the batch carrying it arrives later.
   */
  private retiringByTag = new Map<number, Set<CSSEventSubscriber>>();

  register(viewTag: number, subscriber: CSSEventSubscriber): void {
    this.retiringByTag.get(viewTag)?.delete(subscriber);
    addToTag(this.subscribersByTag, viewTag, subscriber);
  }

  unregister(viewTag: number, subscriber: CSSEventSubscriber): void {
    const subscribers = this.subscribersByTag.get(viewTag);
    if (!subscribers) {
      return;
    }

    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      this.subscribersByTag.delete(viewTag);
    }
  }

  /**
   * Unsubscribing here, rather than after the batch, is what lets a view that
   * mounts again stay subscribed by simply registering.
   */
  retire(viewTag: number, subscriber: CSSEventSubscriber): void {
    this.unregister(viewTag, subscriber);
    addToTag(this.retiringByTag, viewTag, subscriber);
  }

  dispatch(events: NativeCSSEvent[]): void {
    // Taken up front, so a view retired by a callback in this batch is heard in
    // the next one rather than this one.
    const retiring = this.retiringByTag;
    this.retiringByTag = new Map();

    for (const event of events) {
      const subscribed = this.subscribersByTag.get(event.tag);
      this.notifySubscribers(subscribed, event);
      // Registering again during the batch puts a view in both sets.
      this.notifySubscribers(retiring.get(event.tag), event, subscribed);
    }
  }

  clear(): void {
    this.subscribersByTag.clear();
    this.retiringByTag.clear();
  }

  /** Missing when the event outlived the view it was emitted for. */
  private notifySubscribers(
    subscribers: Set<CSSEventSubscriber> | undefined,
    event: NativeCSSEvent,
    alreadyNotified?: Set<CSSEventSubscriber>
  ): void {
    if (!subscribers) {
      return;
    }

    for (const subscriber of subscribers) {
      if (alreadyNotified?.has(subscriber)) {
        continue;
      }

      try {
        subscriber.handleCSSEvent(event);
      } catch (error) {
        // Reported the way an uncaught error would be anyway, so one broken
        // callback stays fatal without starving the views queued behind it.
        // @ts-expect-error React Native's `ErrorUtils` are hidden from the global scope.
        globalThis.ErrorUtils.reportFatalError(error);
      }
    }
  }
}

function addToTag(
  byTag: Map<number, Set<CSSEventSubscriber>>,
  viewTag: number,
  subscriber: CSSEventSubscriber
): void {
  const subscribers = byTag.get(viewTag);
  if (subscribers) {
    subscribers.add(subscriber);
  } else {
    byTag.set(viewTag, new Set([subscriber]));
  }
}

const cssCallbacksRegistry = new CSSCallbacksRegistry();

export default cssCallbacksRegistry;
