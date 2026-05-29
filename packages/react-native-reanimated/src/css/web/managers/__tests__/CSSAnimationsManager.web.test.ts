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
  });

  describe('detach (update with null)', () => {
    test('clears the element animation and removes the inserted keyframes', () => {
      manager.update(animation());
      manager.update(null);

      expect(removeCSSAnimation).toHaveBeenCalled();
      // removeElementAnimation clears the element's animation longhands.
      expect(element.style.animationName).toBe('');
    });

    test('is a no-op when no animation was ever attached', () => {
      manager.update(null);

      expect(removeCSSAnimation).not.toHaveBeenCalled();
    });
  });
});
