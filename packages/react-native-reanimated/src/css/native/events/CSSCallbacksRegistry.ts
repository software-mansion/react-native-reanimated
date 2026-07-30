'use strict';
import { logger } from '../../../common';
import type { CSSEventSubscriber, NativeCSSEvent } from './types';

/**
 * Routes CSS events emitted by the native side to the JS objects interested in
 * a given view.
 *
 * Nested animated components can share a single view tag, so every tag keeps a
 * set of subscribers instead of a single one.
 */
class CSSCallbacksRegistry {
  private readonly subscribersByTag_ = new Map<
    number,
    Set<CSSEventSubscriber>
  >();

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

  dispatch(events: NativeCSSEvent[]): void {
    for (const event of events) {
      const subscribers = this.subscribersByTag_.get(event.tag);
      if (!subscribers) {
        // An event can outlive the view it was emitted for.
        continue;
      }

      // Snapshot the subscribers as a user callback can mount or unmount views.
      for (const subscriber of Array.from(subscribers)) {
        this.deliver(subscriber, event);
      }
    }
  }

  clear(): void {
    this.subscribersByTag_.clear();
  }

  private deliver(subscriber: CSSEventSubscriber, event: NativeCSSEvent): void {
    try {
      subscriber.handleCSSEvent(event);
    } catch (error) {
      // A throwing user callback must not drop the rest of the batch.
      logger.error(
        `A CSS "${event.type}" callback threw an error: ${String(error)}`
      );
    }
  }
}

const cssCallbacksRegistry = new CSSCallbacksRegistry();

export default cssCallbacksRegistry;
