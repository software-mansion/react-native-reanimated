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
});
