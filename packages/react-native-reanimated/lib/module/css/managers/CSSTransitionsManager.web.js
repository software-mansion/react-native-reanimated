'use strict';

import { maybeAddSuffixes, normalizeCSSTransitionProperties, parseTimingFunction } from "../platform/web/index.js";
import { kebabizeCamelCase } from "../utils/index.js";
export default class CSSTransitionsManager {
  constructor(element) {
    this.element = element;
  }
  update(transitionProperties) {
    if (!transitionProperties) {
      this.detach();
      return;
    }
    this.setElementTransition(transitionProperties);
  }
  unmountCleanup() {
    // noop
  }
  detach() {
    this.element.style.transition = '';
    this.element.style.transitionProperty = '';
    this.element.style.transitionDuration = '';
    this.element.style.transitionDelay = '';
    this.element.style.transitionTimingFunction = '';
    // @ts-ignore this is correct
    this.element.style.transitionBehavior = '';
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
//# sourceMappingURL=CSSTransitionsManager.web.js.map