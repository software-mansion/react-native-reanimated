'use strict';
import type { ViewInfo } from '../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import type { CSSStyle } from '../types';
import { filterCSSAndStyleProperties } from '../utils';
import CSSAnimationsManager from './CSSAnimationsManager.web';
import type { CSSManagerInterface } from './CSSManagerInterface';
import CSSTransitionsManager from './CSSTransitionsManager.web';

export default class CSSManagerWeb implements CSSManagerInterface {
  private readonly element: ReanimatedHTMLElement;

  private readonly animationsManager: CSSAnimationsManager;
  private readonly transitionsManager: CSSTransitionsManager;

  constructor(viewInfo: ViewInfo) {
    this.element = viewInfo.DOMElement as ReanimatedHTMLElement;

    this.animationsManager = new CSSAnimationsManager(this.element);
    this.transitionsManager = new CSSTransitionsManager(this.element);
  }

  attach(style: CSSStyle): void {
    this.update(style);
  }

  update(style: CSSStyle): void {
    const [animationConfig, transitionConfig] =
      filterCSSAndStyleProperties(style);

    if (animationConfig) {
      this.animationsManager.update(animationConfig);
    }

    if (transitionConfig) {
      this.transitionsManager.update(transitionConfig);
    }
  }

  detach(): void {
    this.animationsManager.detach();
    this.transitionsManager.detach();
  }
}
