'use strict';
import type { ViewInfo } from '../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import type { CSSStyle } from '../types';
import type { ICSSManager } from '../types/interfaces';
import { filterCSSAndStyleProperties } from '../utils';
import CSSAnimationsManager from './CSSAnimationsManager.web';
import CSSTransitionsManager from './CSSTransitionsManager.web';

export default class CSSManager implements ICSSManager {
  private readonly element: ReanimatedHTMLElement;

  private readonly animationsManager: CSSAnimationsManager;
  private readonly transitionsManager: CSSTransitionsManager;

  constructor(viewInfo: ViewInfo) {
    this.element = viewInfo.DOMElement as ReanimatedHTMLElement;

    this.animationsManager = new CSSAnimationsManager(this.element);
    this.transitionsManager = new CSSTransitionsManager(this.element);
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties] =
      filterCSSAndStyleProperties(style);

    this.animationsManager.update(animationProperties);
    this.transitionsManager.update(transitionProperties);
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
  }
}
