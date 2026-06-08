'use strict';
import { logger } from '../../../common';
import { type WebPropsBuilder, webPropsBuilder } from '../../../common/web';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import { ANIMATION_NAME_PREFIX } from '../../constants';
import { getWebSvgPropsBuilder } from '../../svg/web';
import type { CSSPseudoSelectorKey } from '../../types/pseudo';
import type { PseudoStylesBySelector } from '../../utils';
import { insertPseudoSelectorCSS, removePseudoSelectorCSS } from '../domUtils';

let pseudoSelectorCounter = 0;

const SELECTOR_ORDER: readonly CSSPseudoSelectorKey[] = [
  ':focus-within',
  ':focus',
  ':hover',
  ':active',
  ':active-deepest',
];

const VIEW_ATTRIBUTE = `data-${ANIMATION_NAME_PREFIX}rps`;
const ACTIVE_MARKER_ATTRIBUTE = `data-${ANIMATION_NAME_PREFIX}rps-active`;

function withImportant(css: string): string {
  return css
    .split('; ')
    .map((declaration) => `${declaration} !important`)
    .join('; ');
}

// Known selectors first (in cascade-priority order), then any arbitrary ones the
// web layer passes through unchanged. Order matters: later rules win on overlap.
function orderSelectors(
  pseudoStylesBySelector: PseudoStylesBySelector
): string[] {
  const known = SELECTOR_ORDER.filter((sel) => sel in pseudoStylesBySelector);
  const unknown = Object.keys(pseudoStylesBySelector).filter(
    (sel) => !(SELECTOR_ORDER as readonly string[]).includes(sel)
  );
  return [...known, ...unknown];
}

const SELECTOR_INJECTION_PATTERN = /[{};,]/;

function buildSelectorRule(
  viewId: string,
  selector: string,
  pseudoStylesBySelector: PseudoStylesBySelector,
  propsBuilder: WebPropsBuilder
): string | null {
  if (SELECTOR_INJECTION_PATTERN.test(selector)) {
    if (__DEV__) {
      logger.warn(`Ignoring unsupported pseudo-selector "${selector}".`);
    }
    return null;
  }

  const css = propsBuilder.build(
    pseudoStylesBySelector[selector].selectorStyle
  );
  if (!css) {
    return null;
  }
  const declarations = withImportant(css);
  const base = `[${VIEW_ATTRIBUTE}="${viewId}"]`;

  if (selector === ':active-deepest') {
    return `${base}:active:not(:has([${ACTIVE_MARKER_ATTRIBUTE}="true"]:active)) { ${declarations} }`;
  }
  return `${base}${selector} { ${declarations} }`;
}

function buildRules(
  viewId: string,
  pseudoStylesBySelector: PseudoStylesBySelector,
  propsBuilder: WebPropsBuilder
): string[] {
  return orderSelectors(pseudoStylesBySelector)
    .map((selector) =>
      buildSelectorRule(viewId, selector, pseudoStylesBySelector, propsBuilder)
    )
    .filter((rule): rule is string => rule !== null);
}

export default class CSSPseudoSelectorsManager {
  private readonly element: ReanimatedHTMLElement;
  private readonly componentName: string;
  private viewId: string | null = null;

  constructor(element: ReanimatedHTMLElement, componentName = '') {
    this.element = element;
    this.componentName = componentName;
  }

  update(pseudoStylesBySelector: PseudoStylesBySelector | null): void {
    if (!pseudoStylesBySelector) {
      this.detach();
      return;
    }

    const propsBuilder =
      getWebSvgPropsBuilder(this.componentName) ?? webPropsBuilder;

    const viewId = this.ensureViewId();
    this.syncActiveMarker(pseudoStylesBySelector);
    insertPseudoSelectorCSS(
      viewId,
      buildRules(viewId, pseudoStylesBySelector, propsBuilder)
    );
    this.ensureTransitionProperty();
  }

  unmountCleanup(): void {
    this.detach();
  }

  private ensureViewId(): string {
    if (this.viewId === null) {
      this.viewId = String(pseudoSelectorCounter++);
      this.element.setAttribute(VIEW_ATTRIBUTE, this.viewId);
    }
    return this.viewId;
  }

  private syncActiveMarker(
    pseudoStylesBySelector: PseudoStylesBySelector
  ): void {
    const hasAnyActive =
      ':active' in pseudoStylesBySelector ||
      ':active-deepest' in pseudoStylesBySelector;

    if (hasAnyActive) {
      this.element.setAttribute(ACTIVE_MARKER_ATTRIBUTE, 'true');
    } else {
      this.element.removeAttribute(ACTIVE_MARKER_ATTRIBUTE);
    }
  }

  private ensureTransitionProperty(): void {
    if (
      !this.element.style.transitionProperty &&
      this.element.style.transitionDuration
    ) {
      this.element.style.transitionProperty = 'all';
    }
  }

  private detach(): void {
    if (this.viewId !== null) {
      this.element.removeAttribute(VIEW_ATTRIBUTE);
      this.element.removeAttribute(ACTIVE_MARKER_ATTRIBUTE);
      removePseudoSelectorCSS(this.viewId);
      this.viewId = null;
    }
  }
}
