'use strict';

import { getNormalizedCSSTransitionConfigUpdates, normalizeCSSTransitionProperties } from "../normalization/index.js";
import { registerCSSTransition, unregisterCSSTransition, updateCSSTransition } from "../proxy.js";
export default class CSSTransitionsManager {
  transitionConfig = null;
  constructor(shadowNodeWrapper, viewTag) {
    this.viewTag = viewTag;
    this.shadowNodeWrapper = shadowNodeWrapper;
  }
  update(transitionProperties) {
    if (!transitionProperties) {
      this.detach();
      return;
    }
    const transitionConfig = normalizeCSSTransitionProperties(transitionProperties);
    if (!transitionConfig) {
      this.detach();
      return;
    }
    if (this.transitionConfig) {
      const configUpdates = getNormalizedCSSTransitionConfigUpdates(this.transitionConfig, transitionConfig);
      if (Object.keys(configUpdates).length > 0) {
        this.transitionConfig = transitionConfig;
        updateCSSTransition(this.viewTag, configUpdates);
      }
    } else {
      this.attachTransition(transitionConfig);
    }
  }
  unmountCleanup() {
    // noop
  }
  detach() {
    if (this.transitionConfig) {
      unregisterCSSTransition(this.viewTag);
      this.transitionConfig = null;
    }
  }
  attachTransition(transitionConfig) {
    if (!this.transitionConfig) {
      registerCSSTransition(this.shadowNodeWrapper, transitionConfig);
      this.transitionConfig = transitionConfig;
    }
  }
}
//# sourceMappingURL=CSSTransitionsManager.js.map