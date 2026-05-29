'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import type { ExistingCSSAnimationProperties } from '../../../types';
import CSSAnimationsManager from '../CSSAnimationsManager';

// These tests run end to end against the real jsdom CSSOM: the manager inserts
// real @keyframes rules into the shared <style> tag that domUtils creates, so we
// assert on the actual stylesheet instead of on mocked stylesheet helpers. That
// tag is a single app-wide stylesheet, so we assert on rules by their (unique,
// generated) name rather than on the total rule count.
const STYLE_TAG_ID = 'ReanimatedCSSStyleTag';

const keyframeNames = (): string[] => {
  const sheet = (
    document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  )?.sheet;
  return sheet
    ? Array.from(sheet.cssRules).map((rule) => (rule as CSSKeyframesRule).name)
    : [];
};

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
    element = document.createElement('div') as unknown as ReanimatedHTMLElement;
    manager = new CSSAnimationsManager(element);
  });

  describe('update', () => {
    test('inserts a real @keyframes rule and writes the animation longhands to the element', () => {
      manager.update(
        animation({
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 2,
          animationDirection: 'reverse',
        })
      );

      // The generated name is written to the element and exists as an actual
      // @keyframes rule in the stylesheet.
      expect(element.style.animationName.length).toBeGreaterThan(0);
      expect(keyframeNames()).toContain(element.style.animationName);
      expect(element.style.animationDuration).toBe('200ms');
      expect(element.style.animationTimingFunction).toBe('ease-in-out');
      expect(element.style.animationIterationCount).toBe('2');
      expect(element.style.animationDirection).toBe('reverse');
    });

    test('inserts a real @keyframes rule for each of multiple comma-separated animations', () => {
      const before = new Set(keyframeNames());

      manager.update(
        animation({
          animationName: [
            { from: { opacity: 0 }, to: { opacity: 1 } },
            { from: { opacity: 1 }, to: { opacity: 0 } },
          ],
          animationDuration: [200, 300],
        })
      );

      const inserted = keyframeNames().filter((name) => !before.has(name));
      expect(inserted).toHaveLength(2);
      // Both inserted rules are referenced by the element's animationName.
      inserted.forEach((name) => {
        expect(element.style.animationName).toContain(name);
      });
      expect(element.style.animationDuration).toContain('200ms');
      expect(element.style.animationDuration).toContain('300ms');
    });

    test('removes the previous @keyframes rule when switching to a different animation', () => {
      manager.update(
        animation({
          animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
        })
      );
      const previousName = element.style.animationName;
      expect(keyframeNames()).toContain(previousName);

      manager.update(
        animation({
          animationName: { from: { opacity: 1 }, to: { opacity: 0 } },
        })
      );

      expect(keyframeNames()).not.toContain(previousName);
      expect(keyframeNames()).toContain(element.style.animationName);
    });
  });

  describe('detach', () => {
    test('clears the element animation and removes the @keyframes rule on update(null)', () => {
      manager.update(animation());
      const attachedName = element.style.animationName;
      expect(keyframeNames()).toContain(attachedName);

      manager.update(null);

      expect(element.style.animationName).toBe('');
      expect(keyframeNames()).not.toContain(attachedName);
    });

    test('treats an empty animation name list as a detach', () => {
      manager.update(animation());
      const attachedName = element.style.animationName;
      expect(attachedName.length).toBeGreaterThan(0);

      manager.update(animation({ animationName: [] }));

      expect(element.style.animationName).toBe('');
      expect(keyframeNames()).not.toContain(attachedName);
    });

    test('is a no-op when no animation was ever attached', () => {
      const before = keyframeNames();

      expect(() => manager.update(null)).not.toThrow();
      expect(keyframeNames()).toEqual(before);
    });
  });

  describe('unmountCleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('removes the @keyframes rule from the stylesheet after the cleanup timeout', () => {
      manager.update(animation());
      const attachedName = element.style.animationName;
      expect(keyframeNames()).toContain(attachedName);

      manager.unmountCleanup();
      // Removal is deferred to the end of the event loop, so the rule remains.
      expect(keyframeNames()).toContain(attachedName);

      jest.runAllTimers();
      expect(keyframeNames()).not.toContain(attachedName);
    });
  });
});
