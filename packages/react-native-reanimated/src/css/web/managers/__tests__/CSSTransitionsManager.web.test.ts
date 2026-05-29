'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import type { CSSTransitionProperties } from '../../../types';
import CSSTransitionsManager from '../CSSTransitionsManager';

const transition = (
  overrides: Partial<CSSTransitionProperties> = {}
): CSSTransitionProperties =>
  ({
    transitionProperty: 'opacity',
    transitionDuration: 200,
    transitionDelay: 100,
    transitionTimingFunction: 'ease-in-out',
    ...overrides,
  }) as CSSTransitionProperties;

const transitionEvent = (
  type: string,
  propertyName: string,
  elapsedTime: number
): Event =>
  Object.assign(new Event(type, { bubbles: true }), {
    propertyName,
    elapsedTime,
  });

describe('CSSTransitionsManager (web)', () => {
  let element: ReanimatedHTMLElement;
  let manager: CSSTransitionsManager;

  beforeEach(() => {
    element = document.createElement('div') as unknown as ReanimatedHTMLElement;
    manager = new CSSTransitionsManager(element);
  });

  describe('update', () => {
    test('writes the transition longhands onto the element style', () => {
      manager.update(transition());

      expect(element.style.transitionProperty).toBe('opacity');
      expect(element.style.transitionDuration).toBe('200ms');
      expect(element.style.transitionDelay).toBe('100ms');
      expect(element.style.transitionTimingFunction).toBe('ease-in-out');
    });

    test('kebab-cases camelCased transition properties', () => {
      manager.update(transition({ transitionProperty: 'backgroundColor' }));

      expect(element.style.transitionProperty).toBe('background-color');
    });

    test('writes multiple comma-separated properties and durations', () => {
      manager.update(
        transition({
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: [200, 300],
        })
      );

      expect(element.style.transitionProperty).toContain('opacity');
      expect(element.style.transitionProperty).toContain('transform');
      expect(element.style.transitionDuration).toContain('200ms');
      expect(element.style.transitionDuration).toContain('300ms');
    });
  });

  describe('detach (update with null)', () => {
    test('clears the transition longhands after a transition was attached', () => {
      manager.update(transition());
      manager.update(null);

      expect(element.style.transitionProperty).toBe('');
      expect(element.style.transitionDuration).toBe('');
      expect(element.style.transitionDelay).toBe('');
      expect(element.style.transitionTimingFunction).toBe('');
    });

    test('does not touch the element when no transition was ever attached', () => {
      manager.update(null);

      expect(element.style.cssText).toBe('');
    });
  });

  describe('transition callbacks', () => {
    test('attaches a DOM listener only while its callback is set', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');
      const removeSpy = jest.spyOn(element, 'removeEventListener');

      manager.update(transition(), { onTransitionEnd: jest.fn() });
      expect(addSpy).toHaveBeenCalledWith(
        'transitionend',
        expect.any(Function)
      );

      // Callback removed on the next update -> listener detached.
      manager.update(transition(), {});
      expect(removeSpy).toHaveBeenCalledWith(
        'transitionend',
        expect.any(Function)
      );
    });

    test('subscribes to the matching DOM event for each callback prop', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');

      manager.update(transition(), {
        onTransitionRun: jest.fn(),
        onTransitionStart: jest.fn(),
        onTransitionEnd: jest.fn(),
        onTransitionCancel: jest.fn(),
      });

      for (const eventName of [
        'transitionrun',
        'transitionstart',
        'transitionend',
        'transitioncancel',
      ]) {
        expect(addSpy).toHaveBeenCalledWith(eventName, expect.any(Function));
      }
    });

    test('forwards a camelCased propertyName and elapsedTime when the event fires', () => {
      const onTransitionEnd = jest.fn();
      manager.update(transition(), { onTransitionEnd });

      element.dispatchEvent(
        transitionEvent('transitionend', 'background-color', 0.3)
      );

      expect(onTransitionEnd).toHaveBeenCalledWith({
        propertyName: 'backgroundColor',
        elapsedTime: 0.3,
      });
    });

    test('ignores events that bubble up from descendant nodes', () => {
      const child = document.createElement('div');
      element.appendChild(child);
      const onTransitionEnd = jest.fn();
      manager.update(transition(), { onTransitionEnd });

      // The event bubbles from the child to the element's listener.
      child.dispatchEvent(transitionEvent('transitionend', 'opacity', 0.1));

      expect(onTransitionEnd).not.toHaveBeenCalled();
    });

    test('uses the latest callback without re-subscribing on re-render', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');
      const first = jest.fn();
      const second = jest.fn();

      manager.update(transition(), { onTransitionEnd: first });
      manager.update(transition(), { onTransitionEnd: second });

      const endSubscriptions = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'transitionend'
      );
      expect(endSubscriptions).toHaveLength(1);

      element.dispatchEvent(transitionEvent('transitionend', 'opacity', 0.1));
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    test('detaches all listeners on unmount cleanup', () => {
      const removeSpy = jest.spyOn(element, 'removeEventListener');

      manager.update(transition(), {
        onTransitionStart: jest.fn(),
        onTransitionEnd: jest.fn(),
      });
      manager.unmountCleanup();

      expect(removeSpy).toHaveBeenCalledWith(
        'transitionstart',
        expect.any(Function)
      );
      expect(removeSpy).toHaveBeenCalledWith(
        'transitionend',
        expect.any(Function)
      );
    });
  });
});
