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

  /**
   * Subscribers of views being torn down. The engine emits their cancel while
   * they unmount, but the batch carrying it is dispatched afterwards, so they
   * keep receiving until one batch has gone out.
   */
  private retiringByTag_ = new Map<number, Set<CSSEventSubscriber>>();

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
   * Unsubscribes a view being torn down without dropping it from the next
   * batch. Removing it eagerly, rather than queueing the removal, is what lets
   * a frozen view that remounts re-register itself and stay subscribed.
   */
  retire(viewTag: number, subscriber: CSSEventSubscriber): void {
    this.unregister(viewTag, subscriber);

    const retiring = this.retiringByTag_.get(viewTag);
    if (retiring) {
      retiring.add(subscriber);
    } else {
      this.retiringByTag_.set(viewTag, new Set([subscriber]));
    }
  }

  dispatch(events: NativeCSSEvent[]): void {
    // Swapped before dispatching, so a view retired by a callback in this batch
    // is still heard in the next one rather than this one.
    const retiring = this.retiringByTag_;
    this.retiringByTag_ = new Map();

    for (const event of events) {
      const subscribers = this.subscribersFor_(event.tag, retiring);
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
  }

  clear(): void {
    this.subscribersByTag_.clear();
    this.retiringByTag_.clear();
  }

  private subscribersFor_(
    viewTag: number,
    retiring: Map<number, Set<CSSEventSubscriber>>
  ): Set<CSSEventSubscriber> | undefined {
    const active = this.subscribersByTag_.get(viewTag);
    const retired = retiring.get(viewTag);
    if (!retired) {
      return active;
    }
    // A remounted view is in both, and must still be heard exactly once.
    return active ? new Set([...active, ...retired]) : retired;
  }
}

const cssCallbacksRegistry = new CSSCallbacksRegistry();

export default cssCallbacksRegistry;
