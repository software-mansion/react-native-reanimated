'use strict';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import { maybeAddSuffixes, parseTimingFunction } from '../platform/web';
import type { CSSTransitionProperties } from '../types';
import { convertPropertiesToArrays, kebabizeCamelCase } from '../utils';

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
    // @ts-ignore this is correct
    this.element.style.transitionBehavior = '';
  }

  private setElementAnimation(transitionProperties: CSSTransitionProperties) {
    const propertiesAsArray = convertPropertiesToArrays(transitionProperties);

    const maybeDuration = maybeAddSuffixes(
      propertiesAsArray,
      'transitionDuration',
      'ms'
    );
    if (maybeDuration) {
      this.element.style.transitionDuration = maybeDuration.join(',');
    }

    const maybeDelay = maybeAddSuffixes(
      propertiesAsArray,
      'transitionDelay',
      'ms'
    );
    if (maybeDelay) {
      this.element.style.transitionDelay = maybeDelay.join(',');
    }

    if (propertiesAsArray.transitionProperty) {
      this.element.style.transitionProperty =
        propertiesAsArray.transitionProperty.map(kebabizeCamelCase).join(',');
    }

    if (propertiesAsArray.transitionTimingFunction) {
      this.element.style.transitionTimingFunction = parseTimingFunction(
        propertiesAsArray.transitionTimingFunction
      );
    }

    if (propertiesAsArray.transitionBehavior) {
      // @ts-ignore this is correct
      this.element.style.transitionBehavior =
        propertiesAsArray.transitionBehavior.map(kebabizeCamelCase).join(',');
    }
  }
}
