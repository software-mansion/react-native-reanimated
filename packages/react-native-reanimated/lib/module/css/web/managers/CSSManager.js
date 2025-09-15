'use strict';

import { filterCSSAndStyleProperties } from '../../utils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';
export default class CSSManager {
  constructor(viewInfo) {
    this.element = viewInfo.DOMElement;
    this.animationsManager = new CSSAnimationsManager(this.element);
    this.transitionsManager = new CSSTransitionsManager(this.element);
  }
  update(style) {
    const [animationProperties, transitionProperties] = filterCSSAndStyleProperties(style);
    this.animationsManager.update(animationProperties);
    this.transitionsManager.update(transitionProperties);
  }
  unmountCleanup() {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
  }
}
//# sourceMappingURL=CSSManager.js.map