'use strict';

import { kebabizeCamelCase } from "../../utils/index.js";
import { normalizeCSSTransitionProperties } from "../normalization/index.js";
import { maybeAddSuffixes, parseTimingFunction } from "../utils.js";
export default class CSSTransitionsManager {
  isAttached = false;
  constructor(element) {
    this.element = element;
  }
  update(transitionProperties) {
    if (!transitionProperties) {
      this.detach();
      return;
    }
    this.setElementTransition(transitionProperties);
    this.isAttached = true;
  }
  unmountCleanup() {
    // noop
  }
  detach() {
    if (!this.isAttached) {
      return;
    }
    this.element.style.transition = '';
    this.element.style.transitionProperty = '';
    this.element.style.transitionDuration = '';
    this.element.style.transitionDelay = '';
    this.element.style.transitionTimingFunction = '';
    // @ts-ignore this is correct
    this.element.style.transitionBehavior = '';
    this.isAttached = false;
  }
  setElementTransition(transitionProperties) {
    const normalizedProps = normalizeCSSTransitionProperties(transitionProperties);
    this.element.style.transitionProperty = normalizedProps.transitionProperty.map(kebabizeCamelCase).join(',');
    this.element.style.transitionDuration = maybeAddSuffixes(normalizedProps, 'transitionDuration', 'ms').join(',');
    this.element.style.transitionDelay = maybeAddSuffixes(normalizedProps, 'transitionDelay', 'ms').join(',');
    this.element.style.transitionTimingFunction = parseTimingFunction(normalizedProps.transitionTimingFunction);

    // @ts-ignore this is correct
    this.element.style.transitionBehavior = normalizedProps.transitionBehavior.map(kebabizeCamelCase).join(',');
  }
}
//# sourceMappingURL=CSSTransitionsManager.js.map