'use strict';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties } from '../../utils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSPseudoSelectorsManager from './CSSPseudoSelectorsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly animationsManager: CSSAnimationsManager;
  private readonly transitionsManager: CSSTransitionsManager;
  private readonly pseudoSelectorsManager: CSSPseudoSelectorsManager;

  constructor(viewInfo: ViewInfo) {
    const element = viewInfo.DOMElement as ReanimatedHTMLElement;

    this.animationsManager = new CSSAnimationsManager(element);
    this.transitionsManager = new CSSTransitionsManager(element);
    this.pseudoSelectorsManager = new CSSPseudoSelectorsManager(element);
  }

  update(style: CSSStyle): void {
    const [
      animationProperties,
      transitionProperties,
      ,
      pseudoStylesBySelector,
    ] = filterCSSAndStyleProperties(style);

    this.animationsManager.update(animationProperties);
    this.transitionsManager.update(transitionProperties);
    this.pseudoSelectorsManager.update(pseudoStylesBySelector);
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
    this.pseudoSelectorsManager.unmountCleanup();
  }
}
