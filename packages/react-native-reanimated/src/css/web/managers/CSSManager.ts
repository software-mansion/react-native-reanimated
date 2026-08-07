'use strict';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties, validateCSSCallbacks } from '../../utils';
import { configureWebCSS } from '../domUtils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSPseudoSelectorsManager from './CSSPseudoSelectorsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly animationsManager: CSSAnimationsManager;
  private readonly transitionsManager: CSSTransitionsManager;
  private readonly pseudoSelectorsManager: CSSPseudoSelectorsManager;
  private everHadAnimation = false;
  private everHadTransition = false;

  constructor(viewInfo: ViewInfo, componentDisplayName = '') {
    configureWebCSS();

    const element = viewInfo.DOMElement as ReanimatedHTMLElement;
    const svgElementTag = element?.tagName ?? componentDisplayName;

    this.animationsManager = new CSSAnimationsManager(element, svgElementTag);
    this.transitionsManager = new CSSTransitionsManager(element);
    this.pseudoSelectorsManager = new CSSPseudoSelectorsManager(
      element,
      svgElementTag
    );
  }

  update(style: CSSStyle): void {
    const [
      animationProperties,
      transitionProperties,
      pseudoStylesBySelector,
      animationCallbacks,
      transitionCallbacks,
    ] = filterCSSAndStyleProperties(style);

    this.everHadAnimation ||= animationProperties !== null;
    this.everHadTransition ||= transitionProperties !== null;

    if (__DEV__) {
      validateCSSCallbacks(
        'animation',
        'animationName',
        animationCallbacks,
        this.everHadAnimation
      );
      validateCSSCallbacks(
        'transition',
        'transitionDuration',
        transitionCallbacks,
        this.everHadTransition
      );
    }

    this.animationsManager.update(animationProperties, animationCallbacks);
    this.transitionsManager.update(transitionProperties, transitionCallbacks);
    this.pseudoSelectorsManager.update(pseudoStylesBySelector);
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
    this.pseudoSelectorsManager.unmountCleanup();
  }
}
