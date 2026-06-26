'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import { CSSCallbackListeners } from '../CSSCallbackListeners';

type Prop = 'onFoo' | 'onBar';

const EVENT_NAME: Record<Prop, string> = { onFoo: 'foo', onBar: 'bar' };

type Payload = { detail: string };

const buildPayload = (event: Event): Payload => ({
  detail: (event as CustomEvent).detail as string,
});

const namedEvent = (type: string, detail: string): Event =>
  Object.assign(new Event(type, { bubbles: true }), { detail });

describe('CSSCallbackListeners (web)', () => {
  let element: ReanimatedHTMLElement;
  let listeners: CSSCallbackListeners<Prop, Payload>;

  beforeEach(() => {
    element = document.createElement('div') as unknown as ReanimatedHTMLElement;
    listeners = new CSSCallbackListeners<Prop, Payload>(
      element,
      EVENT_NAME,
      buildPayload
    );
  });

  test('subscribes to the mapped event on the first callback and forwards the built payload', () => {
    const onFoo = jest.fn();
    const addSpy = jest.spyOn(element, 'addEventListener');

    listeners.sync({ onFoo });
    expect(addSpy).toHaveBeenCalledWith('foo', expect.any(Function));

    element.dispatchEvent(namedEvent('foo', 'hello'));
    expect(onFoo).toHaveBeenCalledWith({ detail: 'hello' });
  });

  test('unsubscribes with the same listener reference when the callback is removed', () => {
    const addSpy = jest.spyOn(element, 'addEventListener');
    const removeSpy = jest.spyOn(element, 'removeEventListener');

    listeners.sync({ onFoo: jest.fn() });
    listeners.sync({});

    expect(removeSpy.mock.calls).toEqual(addSpy.mock.calls);
  });

  test('uses the latest callback without re-subscribing on re-sync', () => {
    const first = jest.fn();
    const second = jest.fn();
    const addSpy = jest.spyOn(element, 'addEventListener');

    listeners.sync({ onFoo: first });
    listeners.sync({ onFoo: second });
    expect(addSpy.mock.calls.filter(([name]) => name === 'foo')).toHaveLength(
      1
    );

    element.dispatchEvent(namedEvent('foo', 'x'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('ignores events that bubble up from descendant nodes', () => {
    const onFoo = jest.fn();
    listeners.sync({ onFoo });

    const child = document.createElement('div');
    element.appendChild(child);
    child.dispatchEvent(namedEvent('foo', 'x'));

    expect(onFoo).not.toHaveBeenCalled();
  });

  test('detach removes every listener, and a later sync re-attaches a fresh one', () => {
    const onFoo = jest.fn();
    listeners.sync({ onFoo });

    listeners.detach();
    element.dispatchEvent(namedEvent('foo', 'a'));
    expect(onFoo).not.toHaveBeenCalled();

    const onFooAgain = jest.fn();
    listeners.sync({ onFoo: onFooAgain });
    element.dispatchEvent(namedEvent('foo', 'b'));
    expect(onFooAgain).toHaveBeenCalledWith({ detail: 'b' });
  });

  test('only manages props present in the event-name map', () => {
    const addSpy = jest.spyOn(element, 'addEventListener');

    listeners.sync({ onBaz: jest.fn() } as never);

    expect(addSpy).not.toHaveBeenCalled();
  });

  test('removes the listener when a callback becomes undefined', () => {
    const removeSpy = jest.spyOn(element, 'removeEventListener');

    listeners.sync({ onFoo: jest.fn() });
    listeners.sync({ onFoo: undefined });

    expect(removeSpy).toHaveBeenCalledWith('foo', expect.any(Function));
  });
});
