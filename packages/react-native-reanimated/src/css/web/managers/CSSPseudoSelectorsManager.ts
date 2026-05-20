'use strict';
import { webPropsBuilder } from '../../../common/web';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { ICSSPseudoSelectorsManager } from '../../types/interfaces';
import type { PseudoSelectorKey } from '../../types/props';
import type { PseudoStylesBySelector } from '../../utils';
import { insertPseudoSelectorCSS, removePseudoSelectorCSS } from '../domUtils';

let pseudoSelectorCounter = 0;

// CSS rules are injected in this order so that later rules override earlier ones
// when multiple selectors are active simultaneously (last = highest priority):
// :focus-within < :focus < :hover < :active-deepest < :active
const SELECTOR_ORDER: readonly PseudoSelectorKey[] = [
  ':focus-within',
  ':focus',
  ':hover',
  ':active-deepest',
  ':active',
];

// Marker class added to every element that registers :active or :active-deepest
// Used by the CSS :has() rule on :active-deepest elements
const ACTIVE_MARKER = 'rps-active';

export default class CSSPseudoSelectorsManager implements ICSSPseudoSelectorsManager {
  private readonly element: ReanimatedHTMLElement;
  private pseudoSelectorClassName: string | null = null;

  constructor(element: ReanimatedHTMLElement) {
    this.element = element;
  }

  update(pseudoStylesBySelector: PseudoStylesBySelector | null): void {
    if (!pseudoStylesBySelector) {
      this.detach();
      return;
    }

    if (!this.pseudoSelectorClassName) {
      this.pseudoSelectorClassName = `rps-${pseudoSelectorCounter++}`;
      this.element.classList.add(this.pseudoSelectorClassName);
    }

    const className = this.pseudoSelectorClassName;

    const hasAnyActive =
      ':active' in pseudoStylesBySelector ||
      ':active-deepest' in pseudoStylesBySelector;

    if (hasAnyActive) {
      this.element.classList.add(ACTIVE_MARKER);
    } else {
      this.element.classList.remove(ACTIVE_MARKER);
    }

    const knownSelectors = SELECTOR_ORDER.filter(
      (sel) => sel in pseudoStylesBySelector
    );
    const unknownSelectors = Object.keys(pseudoStylesBySelector).filter(
      (sel) => !(SELECTOR_ORDER as readonly string[]).includes(sel)
    );
    // Known selectors first in defined priority order, unknown appended after.
    // Unknown selectors are passed through as native CSS pseudo-selectors.
    const orderedSelectors = [...knownSelectors, ...unknownSelectors];

    const rules = orderedSelectors
      .map((selector) => {
        const { selectorStyle } = pseudoStylesBySelector[selector];
        const css = webPropsBuilder.build(selectorStyle);
        if (!css) {
          return null;
        }
        // Inline styles applied by RNW have higher specificity than class selectors,
        // so !important is required for our pseudo-selector rules to win.
        const cssWithImportant = css
          .split('; ')
          .map((decl) => `${decl} !important`)
          .join('; ');

        if (selector === ':active-deepest') {
          return `.${className}:active:not(:has(.${ACTIVE_MARKER}:active)) { ${cssWithImportant} }`;
        }
        return `.${className}${selector} { ${cssWithImportant} }`;
      })
      .filter(Boolean)
      .join('\n');

    insertPseudoSelectorCSS(className, rules);

    // When transitionDuration is set but transitionProperty was not explicitly
    // specified, CSSTransitionsManager leaves transitionProperty as an empty
    // string and the browser won't animate anything. Default to 'all'.
    if (
      !this.element.style.transitionProperty &&
      this.element.style.transitionDuration
    ) {
      this.element.style.transitionProperty = 'all';
    }
  }

  unmountCleanup(): void {
    this.detach();
  }

  private detach(): void {
    if (this.pseudoSelectorClassName) {
      this.element.classList.remove(this.pseudoSelectorClassName);
      this.element.classList.remove(ACTIVE_MARKER);
      removePseudoSelectorCSS(this.pseudoSelectorClassName);
      this.pseudoSelectorClassName = null;
    }
  }
}
