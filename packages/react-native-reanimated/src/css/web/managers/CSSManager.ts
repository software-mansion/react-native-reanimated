'use strict';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import { BaseCSSManager } from '../../managers';
import type { CSSStyle, ICSSManager } from '../../types';
import { filterCSSAndStyleProperties } from '../../utils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager extends BaseCSSManager implements ICSSManager {
  private readonly element: ReanimatedHTMLElement;
  private readonly viewName: string;
  private readonly animationsManager: CSSAnimationsManager;
  private readonly transitionsManager: CSSTransitionsManager;

  constructor(viewInfo: ViewInfo) {
    super();
    this.element = viewInfo.DOMElement as ReanimatedHTMLElement;
    this.viewName = viewInfo.viewName ?? this.element.tagName;

    this.animationsManager = new CSSAnimationsManager(this.element);
    this.transitionsManager = new CSSTransitionsManager(this.element);
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties] =
      filterCSSAndStyleProperties(style);

    if (__DEV__) {
      this.warnOnUnsupportedProps(style, this.viewName);
    }

    this.animationsManager.update(animationProperties);
    this.transitionsManager.update(transitionProperties);
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
  }
}
