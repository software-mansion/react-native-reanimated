'use strict';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import CSSManagerBase from '../../managers/CSSManagerBase';
import type { CSSStyle, ICSSManager } from '../../types';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager extends CSSManagerBase implements ICSSManager {
  constructor({ DOMElement, viewName = 'RCTView' }: ViewInfo) {
    const element = DOMElement as ReanimatedHTMLElement;
    const animationsManager = new CSSAnimationsManager(element);
    const transitionsManager = new CSSTransitionsManager(element);

    super(viewName, animationsManager, transitionsManager);
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties] =
      this.filterAndValidateStyle(style);

    this.animationsManager.update(animationProperties);
    this.transitionsManager.update(transitionProperties);
  }
}
