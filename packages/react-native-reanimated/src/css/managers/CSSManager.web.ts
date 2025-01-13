'use strict';

import type { ViewInfo } from '../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import type { CSSStyleProperties } from '../types';
import { filterCSSAndStyleProperties } from '../utils';
import CSSAnimationsManager from './CSSAnimationsManager.web';
import CSSTransitionManager from './CSSTransitionManager.web';

export default class CSSManager {
  private readonly element: ReanimatedHTMLElement;

  private readonly animationsManager: CSSAnimationsManager;
  private readonly transitionsManager: CSSTransitionManager;

  constructor(viewInfo: ViewInfo) {
    this.element = viewInfo.viewTag as ReanimatedHTMLElement;

    this.animationsManager = new CSSAnimationsManager(this.element);
    this.transitionsManager = new CSSTransitionManager(this.element);
  }

  attach(style: CSSStyleProperties): void {
    const [animationConfig, transitionConfig] =
      filterCSSAndStyleProperties(style);

    if (animationConfig) {
      this.animationsManager.attach(animationConfig);
    }

    if (transitionConfig) {
      this.transitionsManager.attach(transitionConfig);
    }
  }

  update(style: CSSStyleProperties): void {
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
