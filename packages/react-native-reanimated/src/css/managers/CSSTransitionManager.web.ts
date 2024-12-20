import type { ReanimatedHTMLElement } from '../../js-reanimated';
import type { CSSTransitionProperties } from '../types';
import { convertConfigPropertiesToArrays } from '../utils';
import { kebabize, maybeAddSuffix, parseTimingFunction } from '../web/utils';

export default class CSSTransitionManager {
  private readonly element: ReanimatedHTMLElement;

  constructor(element: ReanimatedHTMLElement) {
    this.element = element;
  }

  attach(transitionProperties: CSSTransitionProperties | null) {
    if (!transitionProperties) {
      return;
    }

    this.update(transitionProperties);
  }

  update(transitionProperties: CSSTransitionProperties | null) {
    if (!transitionProperties) {
      this.detach();
      return;
    }

    this.setElementAnimation(transitionProperties);
  }

  detach() {
    this.element.style.transitionDuration = '';
    this.element.style.transitionDelay = '';
    this.element.style.transitionProperty = '';
    this.element.style.transitionTimingFunction = '';
  }

  private setElementAnimation(transitionProperties: CSSTransitionProperties) {
    const propertiesAsArray =
      convertConfigPropertiesToArrays(transitionProperties);

    const maybeDuration = maybeAddSuffix(
      propertiesAsArray,
      'transitionDuration',
      'ms'
    );
    if (maybeDuration) {
      this.element.style.transitionDuration = maybeDuration.join(',');
    }

    const maybeDelay = maybeAddSuffix(
      propertiesAsArray,
      'transitionDelay',
      'ms'
    );
    if (maybeDelay) {
      this.element.style.transitionDelay = maybeDelay.join(',');
    }

    if (propertiesAsArray.transitionProperty) {
      this.element.style.transitionProperty =
        propertiesAsArray.transitionProperty.map(kebabize).join(',');
    }

    if (propertiesAsArray.transitionTimingFunction) {
      this.element.style.animationTimingFunction = parseTimingFunction(
        propertiesAsArray.transitionTimingFunction
      );
    }
  }
}
