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
    super(
      viewName,
      new CSSAnimationsManager(element),
      new CSSTransitionsManager(element)
    );
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties] =
      this.filterAndValidateStyle(style);

    this.animationsManager.update(animationProperties);
    this.transitionsManager.update(transitionProperties);
  }
}
