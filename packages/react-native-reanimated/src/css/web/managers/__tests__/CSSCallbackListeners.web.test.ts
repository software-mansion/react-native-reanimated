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

  afterEach(() => {
    jest.restoreAllMocks();
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

  test('scheduled detach waits through the following rendering update', () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      });
    const onFoo = jest.fn();
    listeners.sync({ onFoo });

    listeners.scheduleDetach();
    element.dispatchEvent(namedEvent('foo', 'before-frame'));
    expect(onFoo).toHaveBeenCalledWith({ detail: 'before-frame' });

    frameCallbacks.shift()?.(0);
    element.dispatchEvent(namedEvent('foo', 'after-first-frame'));
    expect(onFoo).toHaveBeenCalledWith({ detail: 'after-first-frame' });

    frameCallbacks.shift()?.(16);
    element.dispatchEvent(namedEvent('foo', 'after-second-frame'));
    expect(onFoo).toHaveBeenCalledTimes(2);
  });

  test('does not schedule detach when no listeners are attached', () => {
    const requestSpy = jest.spyOn(global, 'requestAnimationFrame');
    listeners.scheduleDetach();
    expect(requestSpy).not.toHaveBeenCalled();
  });

  test('sync cancels a scheduled detach when the manager is reused', () => {
    jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(1);
    const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame');
    listeners.sync({ onFoo: jest.fn() });
    listeners.scheduleDetach();

    const onFooAfterReuse = jest.fn();
    listeners.sync({ onFoo: onFooAfterReuse });

    expect(cancelSpy).toHaveBeenCalledWith(1);
    element.dispatchEvent(namedEvent('foo', 'after-reuse'));
    expect(onFooAfterReuse).toHaveBeenCalledWith({ detail: 'after-reuse' });
  });

  test.each([0, 1])(
    'collected managers stop cleanup after %i frames',
    (frames) => {
      const queued: FrameRequestCallback[] = [];
      jest
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          queued.push(callback);
          return queued.length;
        });
      const deref = jest.fn().mockReturnValue(listeners);
      jest
        .spyOn(global, 'WeakRef')
        .mockImplementation(() => ({ deref, [Symbol.toStringTag]: 'WeakRef' }));
      listeners.sync({ onFoo: jest.fn() });
      listeners.scheduleDetach();
      if (frames) {
        queued.shift()?.(0);
      }
      deref.mockReturnValue(undefined);
      queued.shift()?.(16);
      expect(queued).toHaveLength(0);
    }
  );

  test('reuse between frames cancels the second cleanup frame', () => {
    let firstFrame: FrameRequestCallback | undefined;
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementationOnce((callback) => {
        firstFrame = callback;
        return 1;
      })
      .mockReturnValue(2);
    const cancel = jest.spyOn(global, 'cancelAnimationFrame');
    listeners.sync({ onFoo: jest.fn() });
    listeners.scheduleDetach();
    firstFrame?.(0);
    const callback = jest.fn();
    listeners.sync({ onFoo: callback });
    expect(cancel).toHaveBeenCalledWith(2);
    element.dispatchEvent(namedEvent('foo', 'reused'));
    expect(callback).toHaveBeenCalledWith({ detail: 'reused' });
  });

  test('repeated cleanup requests share the pending frame', () => {
    const request = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockReturnValue(1);
    listeners.sync({ onFoo: jest.fn() });
    listeners.scheduleDetach();
    listeners.scheduleDetach();
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('falls back to deferred cleanup when WeakRef is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(global, 'WeakRef')!;
    const queued: FrameRequestCallback[] = [];
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        queued.push(callback);
        return queued.length;
      });
    Object.defineProperty(global, 'WeakRef', {
      ...descriptor,
      value: undefined,
    });
    try {
      const callback = jest.fn();
      listeners.sync({ onFoo: callback });
      listeners.scheduleDetach();
      queued.shift()?.(0);
      element.dispatchEvent(namedEvent('foo', 'cancel'));
      queued.shift()?.(16);
      element.dispatchEvent(namedEvent('foo', 'detached'));
      expect(callback).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(global, 'WeakRef', descriptor);
    }
  });

  // Run with node --expose-gc and --runInBand to check actual reachability.
  (global.gc ? test : test.skip).each([0, 1])(
    'pending cleanup does not retain an unreachable manager after %i frames',
    async (frames) => {
      jest.useRealTimers();
      const queued: FrameRequestCallback[] = [];
      jest
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          queued.push(callback);
          return queued.length;
        });
      const createPending = () => {
        const node = document.createElement(
          'div'
        ) as unknown as ReanimatedHTMLElement;
        const manager = new CSSCallbackListeners(
          node,
          EVENT_NAME,
          buildPayload
        );
        manager.sync({ onFoo: () => {} });
        manager.scheduleDetach();
        return new WeakRef(manager);
      };
      const ref = createPending();
      if (frames) {
        queued.shift()?.(0);
      }
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        global.gc?.();
      }
      expect(ref.deref()).toBeUndefined();
      expect(queued).toHaveLength(1);
      queued.shift()?.(16);
      expect(queued).toHaveLength(0);
    }
  );

  (global.gc ? test : test.skip)(
    'a retained element keeps cancellation callbacks alive',
    async () => {
      jest.useRealTimers();
      const queued: FrameRequestCallback[] = [];
      jest
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          queued.push(callback);
          return queued.length;
        });
      const callback = jest.fn();
      const createPendingElement = () => {
        const node = document.createElement(
          'div'
        ) as unknown as ReanimatedHTMLElement;
        const manager = new CSSCallbackListeners(
          node,
          EVENT_NAME,
          buildPayload
        );
        manager.sync({ onFoo: callback });
        manager.scheduleDetach();
        return node;
      };
      const node = createPendingElement();
      await new Promise((resolve) => setTimeout(resolve, 0));
      global.gc?.();
      queued.shift()?.(0);
      await new Promise((resolve) => setTimeout(resolve, 0));
      global.gc?.();
      node.dispatchEvent(namedEvent('foo', 'cancel'));
      expect(callback).toHaveBeenCalledWith({ detail: 'cancel' });
      queued.shift()?.(16);
      node.dispatchEvent(namedEvent('foo', 'after-cleanup'));
      expect(callback).toHaveBeenCalledTimes(1);
    }
  );

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
