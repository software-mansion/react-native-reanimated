'use strict';
import type { CSSEventSubscriber, NativeCSSEvent } from './types';

/**
 * Routes CSS events emitted by the native side to the objects interested in a
 * given view. Nested animated components can share a view tag, so every tag
 * keeps a set of subscribers rather than a single one.
 *
 * A view that unmounts is retired instead of unregistered: it stops being a
 * subscriber, but still hears the batch after, because the engine emits its
 * cancel as it tears down and that batch arrives once the view is gone.
 */
class CSSCallbacksRegistry {
  private readonly subscribersByTag = new Map<
    number,
    Set<CSSEventSubscriber>
  >();
  private retiringByTag = new Map<number, Set<CSSEventSubscriber>>();

  register(viewTag: number, subscriber: CSSEventSubscriber): void {
    this.retiringByTag.get(viewTag)?.delete(subscriber);
    addSubscriber(this.subscribersByTag, viewTag, subscriber);
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
   * Unregistering now, rather than after the batch it still hears, is what lets
   * a view that mounts again stay subscribed by simply registering.
   */
  retire(viewTag: number, subscriber: CSSEventSubscriber): void {
    this.unregister(viewTag, subscriber);
    addSubscriber(this.retiringByTag, viewTag, subscriber);
  }

  dispatch(events: NativeCSSEvent[]): void {
    // Taken up front, so a view retired by a callback in this batch hears the
    // next one rather than this one.
    const retiring = this.retiringByTag;
    this.retiringByTag = new Map();

    for (const event of events) {
      const subscribers = subscribersFor(
        event.tag,
        this.subscribersByTag,
        retiring
      );

      // Absent once the event outlives the view it was emitted for.
      if (!subscribers) {
        continue;
      }

      for (const subscriber of subscribers) {
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

  clear(): void {
    this.subscribersByTag.clear();
    this.retiringByTag.clear();
  }
}

function addSubscriber(
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

/** One set, because a view that registers again while retiring is in both. */
function subscribersFor(
  viewTag: number,
  subscribed: Map<number, Set<CSSEventSubscriber>>,
  retiring: Map<number, Set<CSSEventSubscriber>>
): Set<CSSEventSubscriber> | undefined {
  const current = subscribed.get(viewTag);
  const retired = retiring.get(viewTag);

  if (!retired) {
    return current;
  }
  return current ? new Set([...current, ...retired]) : retired;
}

const cssCallbacksRegistry = new CSSCallbacksRegistry();

export default cssCallbacksRegistry;
