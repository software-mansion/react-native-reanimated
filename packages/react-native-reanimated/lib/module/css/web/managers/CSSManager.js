'use strict';

import { filterCSSAndStyleProperties } from "../../utils/index.js";
import CSSAnimationsManager from "./CSSAnimationsManager.js";
import CSSTransitionsManager from "./CSSTransitionsManager.js";
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