'use strict';

import { adaptViewConfig } from "../../ConfigHelper.js";
import { setViewStyle, styleBuilder } from "../platform/native/index.js";
import { filterCSSAndStyleProperties } from "../utils/index.js";
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';
export default class CSSManager {
  isFirstUpdate = true;
  constructor({
    shadowNodeWrapper,
    viewConfig,
    viewTag
  }) {
    const tag = this.viewTag = viewTag;
    const wrapper = shadowNodeWrapper;
    this.cssAnimationsManager = new CSSAnimationsManager(wrapper, tag);
    this.cssTransitionsManager = new CSSTransitionsManager(wrapper, tag);
    if (viewConfig) {
      adaptViewConfig(viewConfig);
    }
  }
  update(style) {
    const [animationProperties, transitionProperties, filteredStyle] = filterCSSAndStyleProperties(style);
    const normalizedStyle = styleBuilder.buildFrom(filteredStyle);

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