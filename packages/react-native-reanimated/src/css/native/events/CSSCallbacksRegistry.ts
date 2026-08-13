'use strict';
import type { CSSEventSubscriber, NativeCSSEvent } from './types';

/**
 * Routes CSS events emitted by the native side to the objects interested in a
 * given view. Nested animated components can share a view tag, so every tag
 * keeps a set of subscribers rather than a single one.
 */
class CSSCallbacksRegistry {
  private readonly subscribersByTag_ = new Map<
    number,
    Set<CSSEventSubscriber>
  >();

  /** Subscribers to unregister once the batch in flight has been delivered. */
  private expiringByTag_ = new Map<number, Set<CSSEventSubscriber>>();

  register(viewTag: number, subscriber: CSSEventSubscriber): void {
    const subscribers = this.subscribersByTag_.get(viewTag);
    if (subscribers) {
      subscribers.add(subscriber);
    } else {
      this.subscribersByTag_.set(viewTag, new Set([subscriber]));
    }
  }

  unregister(viewTag: number, subscriber: CSSEventSubscriber): void {
    const subscribers = this.subscribersByTag_.get(viewTag);
    if (!subscribers) {
      return;
    }

    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      this.subscribersByTag_.delete(viewTag);
    }
  }

  /**
   * Unregisters a subscriber only after the next batch. The engine emits the
   * cancel of an unmounting view while it tears down, but the batch carrying it
   * is dispatched afterwards, so removing the subscriber now would drop it.
   * Only called while a view unmounts, which never re-registers.
   */
  retire(viewTag: number, subscriber: CSSEventSubscriber): void {
    const expiring = this.expiringByTag_.get(viewTag);
    if (expiring) {
      expiring.add(subscriber);
    } else {
      this.expiringByTag_.set(viewTag, new Set([subscriber]));
    }
  }

  dispatch(events: NativeCSSEvent[]): void {
    const expiring = this.expiringByTag_;
    this.expiringByTag_ = new Map();

    for (const event of events) {
      const subscribers = this.subscribersByTag_.get(event.tag);
      if (!subscribers) {
        // An event can outlive the view it was emitted for.
        continue;
      }

      for (const subscriber of subscribers) {
        try {
          subscriber.handleCSSEvent(event);
        } catch (error) {
          // A batch carries events for unrelated views, so the error is
          // reported the way an uncaught one would be anyway. That keeps a
          // broken callback fatal without starving the views queued behind it.
          // @ts-expect-error React Native's `ErrorUtils` are hidden from the global scope.
          globalThis.ErrorUtils.reportFatalError(error);
        }
      }
    }

    for (const [viewTag, subscribers] of expiring) {
      for (const subscriber of subscribers) {
        this.unregister(viewTag, subscriber);
      }
    }
  }

  clear(): void {
    this.subscribersByTag_.clear();
    this.expiringByTag_.clear();
  }
}

const cssCallbacksRegistry = new CSSCallbacksRegistry();

export default cssCallbacksRegistry;
