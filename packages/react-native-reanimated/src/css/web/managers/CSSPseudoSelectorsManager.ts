'use strict';
import { webPropsBuilder } from '../../../common/web';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
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

const ACTIVE_MARKER = 'rps-active';

export default class CSSPseudoSelectorsManager {
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
    const orderedSelectors = [...knownSelectors, ...unknownSelectors];

    const rules = orderedSelectors
      .map((selector) => {
        const { selectorStyle } = pseudoStylesBySelector[selector];
        const css = webPropsBuilder.build(selectorStyle);
        if (!css) {
          return null;
        }
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
