'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import type { ExistingCSSAnimationProperties } from '../../../types';
import { insertCSSAnimation, removeCSSAnimation } from '../../domUtils';
import CSSAnimationsManager from '../CSSAnimationsManager';

// The stylesheet operations touch the global CSSOM, so mock them; the element
// style application and cleanup run for real against a jsdom element.
jest.mock('../../domUtils', () => ({
  configureWebCSSAnimations: jest.fn(),
  insertCSSAnimation: jest.fn(),
  removeCSSAnimation: jest.fn(),
}));

const keyframes = { from: { opacity: 0 }, to: { opacity: 1 } };

const animation = (
  overrides: Partial<ExistingCSSAnimationProperties> = {}
): ExistingCSSAnimationProperties =>
  ({
    animationName: keyframes,
    animationDuration: 200,
    ...overrides,
  }) as unknown as ExistingCSSAnimationProperties;

describe('CSSAnimationsManager (web)', () => {
  let element: ReanimatedHTMLElement;
  let manager: CSSAnimationsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    element = document.createElement('div') as unknown as ReanimatedHTMLElement;
    manager = new CSSAnimationsManager(element);
  });

  describe('update', () => {
    test('inserts the keyframes and writes the animation longhands to the element', () => {
      manager.update(
        animation({
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 2,
          animationDirection: 'reverse',
        })
      );

      expect(insertCSSAnimation).toHaveBeenCalledTimes(1);
      expect(element.style.animationName.length).toBeGreaterThan(0);
      expect(element.style.animationDuration).toBe('200ms');
      expect(element.style.animationTimingFunction).toBe('ease-in-out');
      expect(element.style.animationIterationCount).toBe('2');
      expect(element.style.animationDirection).toBe('reverse');
    });

    test('uses the inserted keyframes name as the animationName', () => {
      manager.update(animation());

      const insertedName = (insertCSSAnimation as jest.Mock).mock.calls[0][0];
      expect(element.style.animationName).toBe(insertedName);
    });

    test('writes multiple comma-separated animations and inserts each keyframes set', () => {
      manager.update(
        animation({
          animationName: [
            { from: { opacity: 0 }, to: { opacity: 1 } },
            { from: { opacity: 1 }, to: { opacity: 0 } },
          ],
          animationDuration: [200, 300],
        })
      );

      const insertedNames = (insertCSSAnimation as jest.Mock).mock.calls.map(
        (call) => call[0]
      );
      expect(insertedNames).toHaveLength(2);
      expect(element.style.animationName).toContain(insertedNames[0]);
      expect(element.style.animationName).toContain(insertedNames[1]);
      expect(element.style.animationDuration).toContain('200ms');
      expect(element.style.animationDuration).toContain('300ms');
    });

    test('removes the previous keyframes when switching to a different animation', () => {
      manager.update(
        animation({
          animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
        })
      );
      const previousName = (insertCSSAnimation as jest.Mock).mock.calls[0][0];

      manager.update(
        animation({
          animationName: { from: { opacity: 1 }, to: { opacity: 0 } },
        })
      );

      expect(removeCSSAnimation).toHaveBeenCalledWith(previousName);
    });
  });

  describe('detach', () => {
    test('clears the element animation and removes the inserted keyframes on update(null)', () => {
      manager.update(animation());
      manager.update(null);

      expect(removeCSSAnimation).toHaveBeenCalled();
      // removeElementAnimation clears the element's animation longhands.
      expect(element.style.animationName).toBe('');
    });

    test('treats an empty animation name list as a detach', () => {
      manager.update(animation());
      expect(element.style.animationName.length).toBeGreaterThan(0);

      manager.update(animation({ animationName: [] }));

      expect(element.style.animationName).toBe('');
      expect(removeCSSAnimation).toHaveBeenCalled();
    });

    test('is a no-op when no animation was ever attached', () => {
      manager.update(null);

      expect(removeCSSAnimation).not.toHaveBeenCalled();
    });
  });

  describe('unmountCleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('removes the inserted keyframes from the stylesheet after the cleanup timeout', () => {
      manager.update(animation());
      const insertedName = (insertCSSAnimation as jest.Mock).mock.calls[0][0];

      manager.unmountCleanup();
      // Removal is deferred to the end of the event loop, so nothing is gone yet.
      expect(removeCSSAnimation).not.toHaveBeenCalled();

      jest.runAllTimers();
      expect(removeCSSAnimation).toHaveBeenCalledWith(insertedName);
    });
  });
});
