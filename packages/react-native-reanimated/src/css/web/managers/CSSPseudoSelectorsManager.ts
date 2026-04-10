'use strict';
import { webPropsBuilder } from '../../../common/web';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { ICSSPseudoSelectorsManager } from '../../types/interfaces';
import type { PseudoStylesBySelector } from '../../utils';
import { insertPseudoSelectorCSS, removePseudoSelectorCSS } from '../domUtils';

let pseudoSelectorCounter = 0;

// CSS rules are injected in this order so that later selectors override earlier ones
// when multiple are active simultaneously. Mirrors web convention (LVHA):
// :focus-within < :focus < :hover < :active-deepest < :active
const SELECTOR_ORDER = [
  ':focus-within',
  ':focus',
  ':hover',
  ':active-deepest',
  ':active',
] as const;
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

      case ':active-deepest': {
        const onMouseDown = (e: Event) => {
          const target = (e as MouseEvent).target as Element;
          if (!this.element.contains(target)) {
            return;
          }
          if (!this.element.querySelector('[class*="-active-deepest"]')) {
            this.element.classList.add(cls);
          }
        };
        const onMouseUp = () => remove();
        this.on(this.element, 'mousedown', onMouseDown);
        this.on(document, 'mouseup', onMouseUp);
        break;
      }

      case ':focus': {
        const target = this.getDirectFocusTarget();
        if (target) {
          this.on(target, 'focus', add);
          this.on(target, 'blur', remove);
        }
        break;
      }

      case ':focus-within': {
        const target = this.getFocusWithinTarget();
        if (target) {
          this.on(target, 'focus', add);
          this.on(target, 'blur', remove);
        }
        break;
      }
    }
  }

  private getDirectFocusTarget(): Element | null {
    const tag = this.element.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return this.isFocusable(this.element) ? this.element : null;
    }
    return null;
  }

  private getFocusWithinTarget(): Element | null {
    const tag = this.element.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return this.isFocusable(this.element) ? this.element : null;
    }
    const candidates = this.element.querySelectorAll('input, textarea');
    for (const candidate of Array.from(candidates)) {
      if (this.isFocusable(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private isFocusable(el: Element): boolean {
    const input = el as HTMLInputElement;
    if (input.disabled || input.readOnly) {
      return false;
    }
    if (
      typeof window !== 'undefined' &&
      window.getComputedStyle(el).pointerEvents === 'none'
    ) {
      return false;
    }
    return true;
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
