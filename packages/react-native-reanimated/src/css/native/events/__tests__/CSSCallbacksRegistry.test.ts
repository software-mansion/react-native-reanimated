'use strict';
import cssCallbacksRegistry from '../CSSCallbacksRegistry';
import type { CSSEventSubscriber, NativeCSSEvent } from '../types';

const event = (tag: number, name = 'anim'): NativeCSSEvent => ({
  tag,
  type: 'animationEnd',
  name,
  elapsedTime: 1,
});

const subscriber = (
  handleCSSEvent: jest.Mock = jest.fn()
): CSSEventSubscriber & { handleCSSEvent: jest.Mock } => ({ handleCSSEvent });

describe('cssCallbacksRegistry', () => {
  beforeEach(() => {
    cssCallbacksRegistry.clear();
  });

  test('delivers an event to the subscriber registered for its tag', () => {
    const sub = subscriber();
    cssCallbacksRegistry.register(1, sub);

    cssCallbacksRegistry.dispatch([event(1)]);

    expect(sub.handleCSSEvent).toHaveBeenCalledWith(event(1));
  });

  test('delivers an event to every subscriber sharing a tag', () => {
    const outer = subscriber();
    const inner = subscriber();
    cssCallbacksRegistry.register(1, outer);
    cssCallbacksRegistry.register(1, inner);

    cssCallbacksRegistry.dispatch([event(1)]);

    expect(outer.handleCSSEvent).toHaveBeenCalledTimes(1);
    expect(inner.handleCSSEvent).toHaveBeenCalledTimes(1);
  });

  test('registering the same subscriber twice delivers the event once', () => {
    const sub = subscriber();
    cssCallbacksRegistry.register(1, sub);
    cssCallbacksRegistry.register(1, sub);

    cssCallbacksRegistry.dispatch([event(1)]);

    expect(sub.handleCSSEvent).toHaveBeenCalledTimes(1);
  });

  test('routes each event to the subscribers of its own tag', () => {
    const first = subscriber();
    const second = subscriber();
    cssCallbacksRegistry.register(1, first);
    cssCallbacksRegistry.register(2, second);

    cssCallbacksRegistry.dispatch([event(2)]);

    expect(first.handleCSSEvent).not.toHaveBeenCalled();
    expect(second.handleCSSEvent).toHaveBeenCalledTimes(1);
  });

  test('unregistering one subscriber keeps the others attached', () => {
    const outer = subscriber();
    const inner = subscriber();
    cssCallbacksRegistry.register(1, outer);
    cssCallbacksRegistry.register(1, inner);

    cssCallbacksRegistry.unregister(1, outer);
    cssCallbacksRegistry.dispatch([event(1)]);

    expect(outer.handleCSSEvent).not.toHaveBeenCalled();
    expect(inner.handleCSSEvent).toHaveBeenCalledTimes(1);
  });

  test('drops the tag entry once its last subscriber is unregistered', () => {
    const sub = subscriber();
    cssCallbacksRegistry.register(1, sub);
    cssCallbacksRegistry.unregister(1, sub);

    // @ts-expect-error - reading a private field to assert there is no leak
    expect(cssCallbacksRegistry.subscribersByTag_.has(1)).toBe(false);
  });

  test('unregistering an unknown tag or subscriber is a no-op', () => {
    const sub = subscriber();
    cssCallbacksRegistry.register(1, sub);

    expect(() => {
      cssCallbacksRegistry.unregister(2, sub);
      cssCallbacksRegistry.unregister(1, subscriber());
    }).not.toThrow();

    cssCallbacksRegistry.dispatch([event(1)]);
    expect(sub.handleCSSEvent).toHaveBeenCalledTimes(1);
  });

  test('an event for an unknown tag is silently ignored', () => {
    const sub = subscriber();
    cssCallbacksRegistry.register(1, sub);

    expect(() => cssCallbacksRegistry.dispatch([event(99)])).not.toThrow();
    expect(sub.handleCSSEvent).not.toHaveBeenCalled();
  });

  test('an error thrown by a subscriber reaches the caller', () => {
    const throwing = subscriber(
      jest.fn(() => {
        throw new Error('[Reanimated] boom');
      })
    );
    cssCallbacksRegistry.register(1, throwing);

    expect(() => cssCallbacksRegistry.dispatch([event(1)])).toThrow('boom');
  });

  test('a subscriber unregistering itself while dispatching does not break the batch', () => {
    const first: CSSEventSubscriber = {
      handleCSSEvent: jest.fn(() => {
        cssCallbacksRegistry.unregister(1, first);
      }),
    };
    const second = subscriber();
    cssCallbacksRegistry.register(1, first);
    cssCallbacksRegistry.register(1, second);

    cssCallbacksRegistry.dispatch([event(1)]);

    expect(second.handleCSSEvent).toHaveBeenCalledTimes(1);
  });

  test('clear drops every subscription', () => {
    const sub = subscriber();
    cssCallbacksRegistry.register(1, sub);

    cssCallbacksRegistry.clear();
    cssCallbacksRegistry.dispatch([event(1)]);

    expect(sub.handleCSSEvent).not.toHaveBeenCalled();
  });
});
