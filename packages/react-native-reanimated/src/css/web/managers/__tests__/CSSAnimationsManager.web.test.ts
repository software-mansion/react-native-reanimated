'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import {
  registerWebSvgPropsBuilder,
  SVG_POLYGON_WEB_PROPERTIES_CONFIG,
} from '../../../svg/web';
import type { ExistingCSSAnimationProperties } from '../../../types';
import { processKeyframeDefinitions } from '../../animationParser';
import { insertCSSAnimation, removeCSSAnimation } from '../../domUtils';
import CSSAnimationsManager from '../CSSAnimationsManager';

jest.mock('../../domUtils', () => ({
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
    test('hands the processed keyframes to domUtils and writes the animation longhands to the element', () => {
      manager.update(
        animation({
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 2,
          animationDirection: 'reverse',
        })
      );

      // Boundary: the manager inserts the processed keyframes under the same
      // name it writes to the element.
      expect(insertCSSAnimation).toHaveBeenCalledTimes(1);
      expect(insertCSSAnimation).toHaveBeenCalledWith(
        element.style.animationName,
        processKeyframeDefinitions(keyframes)
      );
      // Element longhands.
      expect(element.style.animationDuration).toBe('200ms');
      expect(element.style.animationTimingFunction).toBe('ease-in-out');
      expect(element.style.animationIterationCount).toBe('2');
      expect(element.style.animationDirection).toBe('reverse');
    });

    test('inserts every one of multiple comma-separated animations', () => {
      manager.update(
        animation({
          animationName: [
            { from: { opacity: 0 }, to: { opacity: 1 } },
            { from: { opacity: 1 }, to: { opacity: 0 } },
          ],
          animationDuration: [200, 300],
        })
      );

      expect(insertCSSAnimation).toHaveBeenCalledTimes(2);
      const insertedNames = (insertCSSAnimation as jest.Mock).mock.calls.map(
        (call) => call[0]
      );
      insertedNames.forEach((name) => {
        expect(element.style.animationName).toContain(name);
      });
      expect(element.style.animationDuration).toContain('200ms');
      expect(element.style.animationDuration).toContain('300ms');
    });

    test('builds SVG keyframes with the SVG props builder for SVG components', () => {
      // Polygon aliases `points` -> `d` (path()), a transform only the SVG
      // builder does - so this verifies the manager threads its componentName
      // into the keyframe pipeline for SVG components (not just the generic one).
      registerWebSvgPropsBuilder('Polygon', SVG_POLYGON_WEB_PROPERTIES_CONFIG);
      const svgManager = new CSSAnimationsManager(element, 'Polygon');

      svgManager.update({
        animationName: {
          from: { points: '0,0 10,10 20,0' },
          to: { points: '0,0 10,20 20,0' },
        },
        animationDuration: 200,
      } as unknown as ExistingCSSAnimationProperties);

      expect(insertCSSAnimation).toHaveBeenCalledWith(
        element.style.animationName,
        'from { d: path("M0,0 10,10 20,0Z") } to { d: path("M0,0 10,20 20,0Z") }'
      );
    });

    test('removes the previous animation when switching to a different one', () => {
      manager.update(
        animation({
          animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
        })
      );
      const previousName = element.style.animationName;

      manager.update(
        animation({
          animationName: { from: { opacity: 1 }, to: { opacity: 0 } },
        })
      );

      expect(removeCSSAnimation).toHaveBeenCalledWith(previousName);
    });
  });

  describe('detach', () => {
    test('removes the keyframes and clears the element animation on update(null)', () => {
      manager.update(animation());
      const attachedName = element.style.animationName;

      manager.update(null);

      expect(removeCSSAnimation).toHaveBeenCalledWith(attachedName);
      // removeElementAnimation (not mocked) clears the element longhands.
      expect(element.style.animationName).toBe('');
    });

    test('treats an empty animation name list as a detach', () => {
      manager.update(animation());
      const attachedName = element.style.animationName;

      manager.update(animation({ animationName: [] }));

      expect(removeCSSAnimation).toHaveBeenCalledWith(attachedName);
      expect(element.style.animationName).toBe('');
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

    test('removes the keyframes from the stylesheet after the cleanup timeout', () => {
      manager.update(animation());
      const attachedName = element.style.animationName;

      manager.unmountCleanup();
      // Removal is deferred to the end of the event loop, so nothing happens yet.
      expect(removeCSSAnimation).not.toHaveBeenCalled();

      jest.runAllTimers();
      expect(removeCSSAnimation).toHaveBeenCalledWith(attachedName);
    });
  });
});
