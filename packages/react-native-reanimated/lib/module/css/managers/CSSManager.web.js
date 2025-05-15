'use strict';

import { filterCSSAndStyleProperties } from "../utils/index.js";
import CSSAnimationsManager from "./CSSAnimationsManager.web.js";
import CSSTransitionsManager from "./CSSTransitionsManager.web.js";
export default class CSSManager {
  constructor(viewInfo) {
    this.element = viewInfo.DOMElement;
    this.animationsManager = new CSSAnimationsManager(this.element);
    this.transitionsManager = new CSSTransitionsManager(this.element);
  }
  update(style) {
    const [animationConfig, transitionConfig] = filterCSSAndStyleProperties(style);
    if (animationConfig) {
      this.animationsManager.update(animationConfig);
    }
    if (transitionConfig) {
      this.transitionsManager.update(transitionConfig);
    }
  }
  unmountCleanup() {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
  }
}
//# sourceMappingURL=CSSManager.web.js.map