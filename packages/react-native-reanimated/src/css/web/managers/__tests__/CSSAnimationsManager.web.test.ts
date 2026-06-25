'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import {
  registerWebSvgPropsBuilder,
  SVG_PATH_WEB_PROPERTIES_CONFIG,
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

const animationEvent = (
  eventType: string,
  animationName: string,
  elapsedTime: number
): Event =>
  Object.assign(new Event(eventType, { bubbles: true }), {
    animationName,
    elapsedTime,
  });

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
      // Path wraps `d` in path() - a transform only the SVG builder does - so
      // this verifies the manager threads its componentName into the keyframe
      // pipeline for SVG components (not just the generic one).
      registerWebSvgPropsBuilder('Path', SVG_PATH_WEB_PROPERTIES_CONFIG);
      const svgManager = new CSSAnimationsManager(element, 'Path');

      svgManager.update({
        animationName: {
          from: { d: 'M0,0 L10,10 L20,0' },
          to: { d: 'M0,0 L10,20 L20,0' },
        },
        animationDuration: 200,
      } as unknown as ExistingCSSAnimationProperties);

      expect(insertCSSAnimation).toHaveBeenCalledWith(
        element.style.animationName,
        'from { d: path("M0,0 L10,10 L20,0") } to { d: path("M0,0 L10,20 L20,0") }'
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

  describe('animation callbacks', () => {
    test('attaches a listener when its callback is set and detaches the same one when it is removed', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');
      const removeSpy = jest.spyOn(element, 'removeEventListener');

      manager.update(animation(), { onAnimationEnd: jest.fn() });
      expect(addSpy).toHaveBeenCalledWith('animationend', expect.any(Function));

      // Removing the callback on the next update must detach the exact same
      // listener (removeEventListener only works with the same reference).
      manager.update(animation(), {});
      expect(removeSpy.mock.calls).toEqual(addSpy.mock.calls);
    });

    test('subscribes to the matching DOM event for each callback prop', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');

      manager.update(animation(), {
        onAnimationStart: jest.fn(),
        onAnimationEnd: jest.fn(),
        onAnimationIteration: jest.fn(),
        onAnimationCancel: jest.fn(),
      });

      for (const eventName of [
        'animationstart',
        'animationend',
        'animationiteration',
        'animationcancel',
      ]) {
        expect(addSpy).toHaveBeenCalledWith(eventName, expect.any(Function));
      }
    });

    test('forwards the animationName and elapsedTime when the event fires', () => {
      const onAnimationEnd = jest.fn();
      manager.update(animation(), { onAnimationEnd });

      element.dispatchEvent(
        animationEvent('animationend', 'my-animation', 0.3)
      );

      expect(onAnimationEnd).toHaveBeenCalledWith({
        animationName: 'my-animation',
        elapsedTime: 0.3,
      });
    });

    test('ignores events that bubble up from descendant nodes', () => {
      const child = document.createElement('div');
      element.appendChild(child);
      const onAnimationEnd = jest.fn();
      manager.update(animation(), { onAnimationEnd });

      // The event bubbles from the child to the element's listener.
      child.dispatchEvent(animationEvent('animationend', 'my-animation', 0.1));

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });

    test('uses the latest callback without re-subscribing on re-render', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');
      const first = jest.fn();
      const second = jest.fn();

      manager.update(animation(), { onAnimationEnd: first });
      manager.update(animation(), { onAnimationEnd: second });

      const endSubscriptions = addSpy.mock.calls.filter(
        ([eventName]) => eventName === 'animationend'
      );
      expect(endSubscriptions).toHaveLength(1);

      element.dispatchEvent(
        animationEvent('animationend', 'my-animation', 0.1)
      );
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    test('detaches the same listeners it attached on unmount cleanup', () => {
      const addSpy = jest.spyOn(element, 'addEventListener');
      const removeSpy = jest.spyOn(element, 'removeEventListener');

      manager.update(animation(), {
        onAnimationStart: jest.fn(),
        onAnimationEnd: jest.fn(),
      });
      manager.unmountCleanup();

      // Every listener that was attached is detached with the same reference.
      expect(removeSpy.mock.calls).toEqual(addSpy.mock.calls);
    });
  });
});
