'use strict';
import { webPropsBuilder } from '../../../common/web';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { ICSSPseudoSelectorsManager } from '../../types/interfaces';
import type { PseudoStylesBySelector } from '../../utils';
import { insertPseudoSelectorCSS, removePseudoSelectorCSS } from '../domUtils';

let pseudoSelectorCounter = 0;

// CSS rules are injected in this order so that later selectors override earlier ones
// when multiple are active simultaneously. Mirrors web convention (LVHA).
const SELECTOR_ORDER = [':focus', ':hover', ':active'] as const;
type KnownSelector = (typeof SELECTOR_ORDER)[number];

export default class CSSPseudoSelectorsManager
  implements ICSSPseudoSelectorsManager
{
  private readonly element: ReanimatedHTMLElement;

  private pseudoSelectorClassName: string | null = null;
  private eventListeners: Array<[EventTarget, string, EventListener]> = [];

  constructor(element: ReanimatedHTMLElement) {
    this.element = element;
  }

  update(pseudoStylesBySelector: PseudoStylesBySelector | null): void {
    this.removeEventListeners();

    if (!pseudoStylesBySelector) {
      this.detach();
      return;
    }

    if (!this.pseudoSelectorClassName) {
      this.pseudoSelectorClassName = `rps-${pseudoSelectorCounter++}`;
    }

    const className = this.pseudoSelectorClassName;

    const orderedSelectors = SELECTOR_ORDER.filter(
      (sel) => sel in pseudoStylesBySelector
    );

    const rules = orderedSelectors
      .map((selector) => {
        const { selectorStyle } = pseudoStylesBySelector[selector];
        const css = webPropsBuilder.build(selectorStyle);
        if (!css) {
          return null;
        }
        // Inline styles applied by RNW have higher specificity than class selectors,
        // so !important is required for our state classes to win.
        const cssWithImportant = css
          .split('; ')
          .map((decl) => `${decl} !important`)
          .join('; ');
        return `.${this.stateClass(selector)} { ${cssWithImportant} }`;
      })
      .filter(Boolean)
      .join('\n');

    insertPseudoSelectorCSS(className, rules);

    for (const selector of orderedSelectors) {
      this.attachListenersForSelector(selector);
    }

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
    this.removeEventListeners();
    this.detach();
  }

  private stateClass(selector: string): string {
    // ':hover' → 'rps-0-hover', ':active' → 'rps-0-active', etc.
    return `${this.pseudoSelectorClassName}${selector.replace(':', '-')}`;
  }

  private attachListenersForSelector(selector: KnownSelector): void {
    const cls = this.stateClass(selector);
    const add = () => this.element.classList.add(cls);
    const remove = () => this.element.classList.remove(cls);

    switch (selector) {
      case ':hover':
        this.on(this.element, 'mouseenter', add);
        this.on(this.element, 'mouseleave', remove);
        break;

      case ':active':
        this.on(this.element, 'mousedown', add);
        this.on(document, 'mouseup', remove);
        break;

      case ':focus': {
        // Mirrors native behavior: :focus only fires for text inputs
        const target = this.getFocusTarget();
        if (target) {
          this.on(target, 'focus', add);
          this.on(target, 'blur', remove);
        }
        break;
      }
    }
  }

  private getFocusTarget(): Element | null {
    const isFocusable = (el: Element): boolean => {
      const input = el as HTMLInputElement;
      return !input.disabled && !input.readOnly;
    };

    const tag = this.element.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return isFocusable(this.element) ? this.element : null;
    }
    return this.element.querySelector(
      'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
    );
  }

  private on(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.eventListeners.push([target, type, listener]);
  }

  private removeEventListeners(): void {
    for (const [target, type, listener] of this.eventListeners) {
      target.removeEventListener(type, listener);
    }
    this.eventListeners = [];
  }

  private detach(): void {
    // Remove any state classes that may still be on the element
    if (this.pseudoSelectorClassName) {
      for (const sel of SELECTOR_ORDER) {
        this.element.classList.remove(this.stateClass(sel));
      }
      removePseudoSelectorCSS(this.pseudoSelectorClassName);
      this.pseudoSelectorClassName = null;
    }
  }
}
