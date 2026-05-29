'use strict';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  removeCSSAnimation,
} from '../domUtils';

// domUtils owns a single shared <style> tag and tracks the @keyframes rules it
// inserts. That state is module-level and persists across tests, so we give
// every animation a unique name and assert on rules by name. Assertions read the
// real jsdom CSSOM, checking the parsed keyframe blocks (selectors + property
// values) rather than the re-serialized cssText, which is jsdom-format-specific.
const STYLE_TAG_ID = 'ReanimatedCSSStyleTag';
const KEYFRAMES = 'from { opacity: 0 } to { opacity: 1 }';

let nextId = 0;
const uniqueName = (): string => `anim_${nextId++}`;

const allRules = (): CSSKeyframesRule[] => {
  const sheet = (
    document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  )?.sheet;
  return sheet ? (Array.from(sheet.cssRules) as CSSKeyframesRule[]) : [];
};

const findRule = (name: string): CSSKeyframesRule | undefined =>
  allRules().find((rule) => rule.name === name);

const hasRule = (name: string): boolean => findRule(name) !== undefined;

const blocksOf = (rule: CSSKeyframesRule): CSSKeyframeRule[] =>
  Array.from(rule.cssRules) as CSSKeyframeRule[];

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
      insertCSSAnimation(name, 'from { opacity: 0 } to { opacity: 1 }');

      const rule = findRule(name);
      expect(rule).toBeDefined();
      const blocks = blocksOf(rule!);
      expect(blocks.map((block) => block.keyText)).toEqual(['from', 'to']);
      expect(blocks.map((block) => block.style.opacity)).toEqual(['0', '1']);
    });

    test('inserts a multi-step animation with several properties per keyframe', () => {
      const name = uniqueName();
      insertCSSAnimation(
        name,
        '0% { opacity: 0; transform: translateX(0px) } ' +
          '50% { opacity: 0.5; width: 20px } ' +
          '100% { opacity: 1; transform: translateX(100px) }'
      );

      const blocks = blocksOf(findRule(name)!);
      expect(blocks.map((block) => block.keyText)).toEqual([
        '0%',
        '50%',
        '100%',
      ]);
      expect(blocks.map((block) => block.style.opacity)).toEqual([
        '0',
        '0.5',
        '1',
      ]);
      expect(blocks[0].style.transform).toBe('translateX(0px)');
      expect(blocks[1].style.width).toBe('20px');
      expect(blocks[2].style.transform).toBe('translateX(100px)');
    });

    test('ignores a duplicate animation name', () => {
      const name = uniqueName();
      insertCSSAnimation(name, KEYFRAMES);
      insertCSSAnimation(name, KEYFRAMES);

      expect(allRules().filter((rule) => rule.name === name)).toHaveLength(1);
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
    });
  });
});
