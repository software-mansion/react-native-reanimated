'use strict';
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

      for (const subscriber of subscribers) {
        subscriber.handleCSSEvent(event);
      }
    }
  }

  clear(): void {
    this.subscribersByTag_.clear();
  }
}

const cssCallbacksRegistry = new CSSCallbacksRegistry();

export default cssCallbacksRegistry;
