'use strict';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  removeCSSAnimation,
} from '../domUtils';

// domUtils owns a single shared <style> tag and tracks the @keyframes rules it
// inserts by index. That state is module-level and persists across tests, so we
// give every animation a unique name and assert on rules by name / relative
// order rather than absolute counts. Assertions read the real jsdom CSSOM.
const STYLE_TAG_ID = 'ReanimatedCSSStyleTag';
const KEYFRAMES = 'from { opacity: 0 } to { opacity: 1 }';

let nextId = 0;
const uniqueName = (): string => `anim_${nextId++}`;

const sheetRules = (): CSSKeyframesRule[] => {
  const sheet = (
    document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  )?.sheet;
  return sheet ? (Array.from(sheet.cssRules) as CSSKeyframesRule[]) : [];
};

const indexOfRule = (name: string): number =>
  sheetRules().findIndex((rule) => rule.name === name);

const hasRule = (name: string): boolean => indexOfRule(name) !== -1;

beforeAll(() => {
  configureWebCSSAnimations();
});

describe('domUtils (web CSS animations stylesheet)', () => {
  describe('configureWebCSSAnimations', () => {
    test('creates a single shared style tag in the document head', () => {
      // Idempotent: calling it again must not add a second tag.
      configureWebCSSAnimations();

      expect(document.querySelectorAll(`#${STYLE_TAG_ID}`)).toHaveLength(1);
    });
  });

  describe('insertCSSAnimation', () => {
    test('inserts a real @keyframes rule with the given name and block contents', () => {
      const name = uniqueName();
      insertCSSAnimation(name, KEYFRAMES);

      const rule = sheetRules().find((r) => r.name === name);
      expect(rule).toBeDefined();
      // The from/to blocks actually made it into the stylesheet.
      expect(rule!.cssRules).toHaveLength(2);
      expect(rule!.cssText).toContain('opacity');
    });

    test('inserts each new animation ahead of the previous one', () => {
      const first = uniqueName();
      const second = uniqueName();
      insertCSSAnimation(first, KEYFRAMES);
      insertCSSAnimation(second, KEYFRAMES);

      // The newest rule is inserted at the front of the stylesheet.
      expect(indexOfRule(second)).toBeLessThan(indexOfRule(first));
    });

    test('ignores a duplicate animation name', () => {
      const name = uniqueName();
      insertCSSAnimation(name, KEYFRAMES);
      insertCSSAnimation(name, KEYFRAMES);

      const matching = sheetRules().filter((r) => r.name === name);
      expect(matching).toHaveLength(1);
    });
  });

  describe('removeCSSAnimation', () => {
    test('removes the matching @keyframes rule from the stylesheet', () => {
      const name = uniqueName();
      insertCSSAnimation(name, KEYFRAMES);
      expect(hasRule(name)).toBe(true);

      removeCSSAnimation(name);

      expect(hasRule(name)).toBe(false);
    });

    test('removes only the targeted rule when several are present', () => {
      const a = uniqueName();
      const b = uniqueName();
      const c = uniqueName();
      insertCSSAnimation(a, KEYFRAMES);
      insertCSSAnimation(b, KEYFRAMES);
      insertCSSAnimation(c, KEYFRAMES);

      removeCSSAnimation(b);

      expect(hasRule(b)).toBe(false);
      expect(hasRule(a)).toBe(true);
      expect(hasRule(c)).toBe(true);
      // Surviving rules keep their relative order (newest first).
      expect(indexOfRule(c)).toBeLessThan(indexOfRule(a));
    });
  });
});
