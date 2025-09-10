'use strict';

import { ReanimatedError } from "../../../common/index.js";
import { filterCSSAndStyleProperties } from "../../utils/index.js";
import { setViewStyle } from "../proxy.js";
import { getStyleBuilder, hasStyleBuilder } from "../registry.js";
import CSSAnimationsManager from "./CSSAnimationsManager.js";
import CSSTransitionsManager from "./CSSTransitionsManager.js";
export default class CSSManager {
  styleBuilder = null;
  isFirstUpdate = true;
  constructor({
    shadowNodeWrapper,
    viewTag,
    viewName = 'RCTView'
  }) {
    const tag = this.viewTag = viewTag;
    const wrapper = shadowNodeWrapper;
    this.viewName = viewName;
    this.styleBuilder = hasStyleBuilder(viewName) ? getStyleBuilder(viewName) : null;
    this.cssAnimationsManager = new CSSAnimationsManager(wrapper, viewName, tag);
    this.cssTransitionsManager = new CSSTransitionsManager(wrapper, tag);
  }
  update(style) {
    const [animationProperties, transitionProperties, filteredStyle] = filterCSSAndStyleProperties(style);
    if (!this.styleBuilder && (animationProperties || transitionProperties)) {
      throw new ReanimatedError(`Tried to apply CSS animations to ${this.viewName} which is not supported`);
    }
    const normalizedStyle = this.styleBuilder?.buildFrom(filteredStyle);

    // If the update is called during the first css style update, we won't
    // trigger CSS transitions and set styles before attaching CSS transitions
    if (this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }
    this.cssTransitionsManager.update(transitionProperties);
    this.cssAnimationsManager.update(animationProperties);

    // If the current update is not the fist one, we want to update CSS
    // animations and transitions first and update the style then to make
    // sure that the new transition is fired with new settings (like duration)
    if (!this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }
    this.isFirstUpdate = false;
  }
  unmountCleanup() {
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
  }
}
//# sourceMappingURL=CSSManager.js.map