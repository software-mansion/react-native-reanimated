'use strict';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  insertPseudoSelectorCSS,
  removeCSSAnimation,
  removePseudoSelectorCSS,
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
        `
          0% { opacity: 0; transform: translateX(0px) }
          50% { opacity: 0.5; width: 20px }
          100% { opacity: 1; transform: translateX(100px) }
        `
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

  let nextOwner = 0;
  const uniqueOwner = (): string => `owner-${nextOwner++}`;

  test('inserts each of an owner rules into the shared sheet', () => {
    const owner = uniqueOwner();
    insertPseudoSelectorCSS(owner, [
      `[data-${owner}]:hover { color: red }`,
      `[data-${owner}]:focus { color: blue }`,
    ]);

    const selectors = styleSelectors();
    expect(selectors).toContain(`[data-${owner}]:hover`);
    expect(selectors).toContain(`[data-${owner}]:focus`);
  });

  test('replaces the owner rules on a subsequent insert', () => {
    const owner = uniqueOwner();
    insertPseudoSelectorCSS(owner, [`[data-${owner}]:hover { color: red }`]);
    insertPseudoSelectorCSS(owner, [`[data-${owner}]:focus { color: blue }`]);

    const selectors = styleSelectors();
    expect(selectors).toContain(`[data-${owner}]:focus`);
    expect(selectors).not.toContain(`[data-${owner}]:hover`);
  });

  test('removes all rules belonging to an owner', () => {
    const owner = uniqueOwner();
    insertPseudoSelectorCSS(owner, [
      `[data-${owner}]:hover { color: red }`,
      `[data-${owner}]:focus { color: blue }`,
    ]);
    expect(styleSelectors()).toContain(`[data-${owner}]:hover`);

    removePseudoSelectorCSS(owner);

    const selectors = styleSelectors();
    expect(selectors).not.toContain(`[data-${owner}]:hover`);
    expect(selectors).not.toContain(`[data-${owner}]:focus`);
  });

  test('removing an owner keeps surrounding rules intact (index shifting)', () => {
    const before = uniqueName();
    const owner = uniqueOwner();
    const after = uniqueName();

    // Animation, then pseudo rules, then another animation - so the pseudo
    // rules sit between two tracked rules in the shared sheet.
    insertCSSAnimation(before, KEYFRAMES);
    insertPseudoSelectorCSS(owner, [
      `[data-${owner}]:hover { color: red }`,
      `[data-${owner}]:focus { color: blue }`,
    ]);
    insertCSSAnimation(after, KEYFRAMES);

    removePseudoSelectorCSS(owner);

    // Both animations must survive the deletion + index re-sync.
    expect(hasRule(before)).toBe(true);
    expect(hasRule(after)).toBe(true);
    expect(styleSelectors()).not.toContain(`[data-${owner}]:hover`);
    expect(styleSelectors()).not.toContain(`[data-${owner}]:focus`);
  });
});
