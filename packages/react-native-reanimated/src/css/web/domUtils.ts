'use strict';
import { IS_WINDOW_AVAILABLE, logger } from '../../common';

const CSS_STYLE_TAG_ID = 'ReanimatedCSSStyleTag';

export function configureWebCSS() {
  if (
    !IS_WINDOW_AVAILABLE || // Without this check SSR crashes because document is undefined (NextExample on CI)
    document.getElementById(CSS_STYLE_TAG_ID) !== null
  ) {
    return;
  }

  const cssStyleTag = document.createElement('style');
  cssStyleTag.id = CSS_STYLE_TAG_ID;

  cssStyleTag.onload = () => {
    if (!cssStyleTag.sheet) {
      logger.error('Failed to create CSS stylesheet.');
    }
  };

  document.head.append(cssStyleTag);
}

function getStyleSheet() {
  return (
    (document.getElementById(CSS_STYLE_TAG_ID) as HTMLStyleElement | null)
      ?.sheet ?? null
  );
}

// Shared registry over the single Reanimated stylesheet. Rules are appended in
// insertion order (callers that depend on source order - e.g. pseudo-selector
// cascade priority - get it) and tracked by a string key. We keep the CSSRule
// object itself and resolve its index at removal time, so the registry cannot
// drift from the actual sheet (rule indices shift when earlier rules are
// deleted, and the style tag can be replaced externally, e.g. by HMR).
const ruleByKey = new Map<string, CSSRule>();

function insertSheetRule(key: string, cssText: string): boolean {
  // Without window availability check SSR crashes because document is undefined
  // (NextExample on CI).
  if (!IS_WINDOW_AVAILABLE || ruleByKey.has(key)) {
    return false;
  }

  const sheet = getStyleSheet();

  if (!sheet) {
    logger.error('Failed to create CSS stylesheet.');
    return false;
  }

  let index: number;
  try {
    index = sheet.insertRule(cssText, sheet.cssRules.length);
  } catch {
    // Browsers throw on rules they can't parse (e.g. unsupported selectors).
    // Stay lenient and skip the rule instead of breaking the whole update.
    logger.warn(`Failed to insert CSS rule: ${cssText}`);
    return false;
  }

  ruleByKey.set(key, sheet.cssRules[index]);
  return true;
}

function removeSheetRule(key: string): void {
  // Without this check SSR crashes because document is undefined (NextExample on CI).
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }

  const rule = ruleByKey.get(key);
  if (rule === undefined) {
    return;
  }
  ruleByKey.delete(key);

  const sheet = getStyleSheet();
  if (!sheet) {
    return;
  }

  // Resolve the rule's current index at removal time - it shifts when earlier
  // rules are deleted (and the rule may be gone if the sheet was replaced).
  const index = Array.prototype.indexOf.call(sheet.cssRules, rule);
  if (index !== -1) {
    sheet.deleteRule(index);
  }
}

export function insertCSSAnimation(animationName: string, keyframes: string) {
  insertSheetRule(
    animationName,
    `@keyframes ${animationName} { ${keyframes} }`
  );
}

export function removeCSSAnimation(animationName: string) {
  removeSheetRule(animationName);
}

// Each owner (a view's `data-rps` id) maps to the keys of the rules it inserted,
// so an update can replace them and unmount can remove them.
const pseudoRuleKeysByOwner = new Map<string, string[]>();

export function insertPseudoSelectorCSS(owner: string, rules: string[]): void {
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }

  // Replace any rules previously inserted for this owner.
  removePseudoSelectorCSS(owner);

  const keys: string[] = [];
  rules.forEach((rule, i) => {
    const key = `${owner}#${i}`;
    if (insertSheetRule(key, rule)) {
      keys.push(key);
    }
  });
  pseudoRuleKeysByOwner.set(owner, keys);
}

export function removePseudoSelectorCSS(owner: string): void {
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }

  const keys = pseudoRuleKeysByOwner.get(owner);
  if (!keys) {
    return;
  }

  keys.forEach(removeSheetRule);
  pseudoRuleKeysByOwner.delete(owner);
}
