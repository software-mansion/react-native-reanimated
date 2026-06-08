'use strict';
import { IS_WINDOW_AVAILABLE, logger } from '../../common';

const CSS_ANIMATIONS_STYLE_TAG_ID = 'ReanimatedCSSStyleTag';

export function configureWebCSSAnimations() {
  if (
    !IS_WINDOW_AVAILABLE || // Without this check SSR crashes because document is undefined (NextExample on CI)
    document.getElementById(CSS_ANIMATIONS_STYLE_TAG_ID) !== null
  ) {
    return;
  }

  const cssStyleTag = document.createElement('style');
  cssStyleTag.id = CSS_ANIMATIONS_STYLE_TAG_ID;

  cssStyleTag.onload = () => {
    if (!cssStyleTag.sheet) {
      logger.error('Failed to create CSS animations stylesheet.');
    }
  };

  document.head.append(cssStyleTag);
}

function getStyleSheet() {
  return (
    (
      document.getElementById(
        CSS_ANIMATIONS_STYLE_TAG_ID
      ) as HTMLStyleElement | null
    )?.sheet ?? null
  );
}

// Shared registry over the single Reanimated stylesheet. Rules are appended in
// insertion order (callers that depend on source order - e.g. pseudo-selector
// cascade priority - get it) and tracked by a string key so they can be removed
// later even though CSSOM rule indices shift when earlier rules are deleted.
const ruleIndexByKey = new Map<string, number>();
const orderedRuleKeys: string[] = [];

function insertSheetRule(key: string, cssText: string): boolean {
  // Without window availability check SSR crashes because document is undefined
  // (NextExample on CI).
  if (!IS_WINDOW_AVAILABLE || ruleIndexByKey.has(key)) {
    return false;
  }

  configureWebCSSAnimations();
  const sheet = getStyleSheet();

  if (!sheet) {
    logger.error('Failed to create CSS stylesheet.');
    return false;
  }

  const index = orderedRuleKeys.length;
  try {
    sheet.insertRule(cssText, index);
  } catch {
    // Browsers throw on rules they can't parse (e.g. unsupported selectors).
    // Stay lenient and skip the rule instead of breaking the whole update.
    logger.warn(`Failed to insert CSS rule: ${cssText}`);
    return false;
  }

  orderedRuleKeys.push(key);
  ruleIndexByKey.set(key, index);
  return true;
}

function removeSheetRule(key: string): void {
  // Without this check SSR crashes because document is undefined (NextExample on CI).
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }

  const index = ruleIndexByKey.get(key);
  if (index === undefined) {
    return;
  }

  getStyleSheet()?.deleteRule(index);
  orderedRuleKeys.splice(index, 1);
  ruleIndexByKey.delete(key);

  // Deleting a rule shifts every later rule down by one.
  for (let i = index; i < orderedRuleKeys.length; ++i) {
    ruleIndexByKey.set(orderedRuleKeys[i], i);
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
