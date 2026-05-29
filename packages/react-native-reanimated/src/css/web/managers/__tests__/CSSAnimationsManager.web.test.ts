'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import type { ExistingCSSAnimationProperties } from '../../../types';
import { processKeyframeDefinitions } from '../../animationParser';
import { insertCSSAnimation, removeCSSAnimation } from '../../domUtils';
import CSSAnimationsManager from '../CSSAnimationsManager';

// The manager's job is orchestration: hand the processed keyframes to the
// domUtils stylesheet helpers and write the animation longhands onto the
// element. We mock that apply boundary (mirroring how the native manager test
// mocks the `proxy` apply functions) and assert on the calls. The stylesheet
// mechanics are covered by domUtils.web.test.ts and the keyframe string format
// by animationParser.test.ts.
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

    afterEach(() => {
      jest.useRealTimers();
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
