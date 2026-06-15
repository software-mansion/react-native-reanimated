'use strict';
import type * as DomUtilsModule from '../domUtils';

// domUtils owns a single shared <style> tag and a module-level rule registry.
// To keep test cases independent, every test gets a fresh module instance
// (jest.resetModules) and a clean document head, so rules from one test can
// never leak into another. Assertions read the real jsdom CSSOM, checking the
// parsed rules (selectors + property values) rather than the re-serialized
// cssText, which is jsdom-format-specific.
const STYLE_TAG_ID = 'ReanimatedCSSStyleTag';
const KEYFRAMES = 'from { opacity: 0 } to { opacity: 1 }';

type DomUtils = typeof DomUtilsModule;

let domUtils: DomUtils;

beforeEach(() => {
  jest.resetModules();
  document.getElementById(STYLE_TAG_ID)?.remove();
  domUtils = jest.requireActual<DomUtils>('../domUtils');
  domUtils.configureWebCSS();
});

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

describe('domUtils (web CSS animations stylesheet)', () => {
  describe('configureWebCSS', () => {
    test('creates a single shared style tag in the document head', () => {
      // Idempotent: calling it again must not add a second tag.
      domUtils.configureWebCSS();

      expect(document.querySelectorAll(`#${STYLE_TAG_ID}`)).toHaveLength(1);
    });
  });

  describe('insertCSSAnimation', () => {
    test('inserts a real @keyframes rule with the given name and block contents', () => {
      domUtils.insertCSSAnimation(
        'fade',
        'from { opacity: 0 } to { opacity: 1 }'
      );

      const rule = findRule('fade');
      expect(rule).toBeDefined();
      const blocks = blocksOf(rule!);
      expect(blocks.map((block) => block.keyText)).toEqual(['from', 'to']);
      expect(blocks.map((block) => block.style.opacity)).toEqual(['0', '1']);
    });

    test('inserts a multi-step animation with several properties per keyframe', () => {
      domUtils.insertCSSAnimation(
        'slide',
        `
          0% { opacity: 0; transform: translateX(0px) }
          50% { opacity: 0.5; width: 20px }
          100% { opacity: 1; transform: translateX(100px) }
        `
      );

      const blocks = blocksOf(findRule('slide')!);
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
      domUtils.insertCSSAnimation('fade', KEYFRAMES);
      domUtils.insertCSSAnimation('fade', KEYFRAMES);

      expect(allRules().filter((rule) => rule.name === 'fade')).toHaveLength(1);
    });
  });

  describe('removeCSSAnimation', () => {
    test('removes the matching @keyframes rule from the stylesheet', () => {
      domUtils.insertCSSAnimation('fade', KEYFRAMES);
      expect(hasRule('fade')).toBe(true);

      domUtils.removeCSSAnimation('fade');

      expect(hasRule('fade')).toBe(false);
    });

    test('removes only the targeted rule when several are present', () => {
      domUtils.insertCSSAnimation('first', KEYFRAMES);
      domUtils.insertCSSAnimation('second', KEYFRAMES);
      domUtils.insertCSSAnimation('third', KEYFRAMES);

      domUtils.removeCSSAnimation('second');

      expect(hasRule('second')).toBe(false);
      expect(hasRule('first')).toBe(true);
      expect(hasRule('third')).toBe(true);
    });
  });
});

describe('domUtils (web pseudo-selector rules)', () => {
  // Pseudo rules are regular style rules in the same shared sheet, so we read
  // them back from the real CSSOM by selector text.
  const styleSelectors = (): string[] => {
    const sheet = (
      document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
    )?.sheet;
    if (!sheet) {
      return [];
    }
    return Array.from(sheet.cssRules)
      .filter((rule): rule is CSSStyleRule => 'selectorText' in rule)
      .map((rule) => rule.selectorText);
  };

  test('inserts each of an owner rules into the shared sheet', () => {
    domUtils.insertPseudoSelectorCSS('0', [
      '[data-rps="0"]:hover { color: red }',
      '[data-rps="0"]:focus { color: blue }',
    ]);

    const selectors = styleSelectors();
    expect(selectors).toContain('[data-rps="0"]:hover');
    expect(selectors).toContain('[data-rps="0"]:focus');
  });

  test('replaces the owner rules on a subsequent insert', () => {
    domUtils.insertPseudoSelectorCSS('0', [
      '[data-rps="0"]:hover { color: red }',
    ]);
    domUtils.insertPseudoSelectorCSS('0', [
      '[data-rps="0"]:focus { color: blue }',
    ]);

    const selectors = styleSelectors();
    expect(selectors).toContain('[data-rps="0"]:focus');
    expect(selectors).not.toContain('[data-rps="0"]:hover');
  });

  test('removes all rules belonging to an owner', () => {
    domUtils.insertPseudoSelectorCSS('0', [
      '[data-rps="0"]:hover { color: red }',
      '[data-rps="0"]:focus { color: blue }',
    ]);
    expect(styleSelectors()).toContain('[data-rps="0"]:hover');

    domUtils.removePseudoSelectorCSS('0');

    expect(styleSelectors()).toHaveLength(0);
  });

  test('removing an owner keeps surrounding rules intact (index shifting)', () => {
    // Animation, then pseudo rules, then another animation - so the pseudo
    // rules sit between two tracked rules in the shared sheet.
    domUtils.insertCSSAnimation('before', KEYFRAMES);
    domUtils.insertPseudoSelectorCSS('0', [
      '[data-rps="0"]:hover { color: red }',
      '[data-rps="0"]:focus { color: blue }',
    ]);
    domUtils.insertCSSAnimation('after', KEYFRAMES);

    domUtils.removePseudoSelectorCSS('0');

    // Both animations must survive the deletion + index re-sync.
    expect(hasRule('before')).toBe(true);
    expect(hasRule('after')).toBe(true);
    expect(styleSelectors()).toHaveLength(0);
  });
});
