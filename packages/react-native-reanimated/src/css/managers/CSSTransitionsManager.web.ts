'use strict';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import { maybeAddSuffixes, parseTimingFunction } from '../platform/web';
import type { CSSTransitionProp, CSSTransitionProperties } from '../types';
import { convertPropertiesToArrays, kebabizeCamelCase } from '../utils';

export default class CSSTransitionsManager {
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

    this.setElementTransition(transitionProperties);
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

  private setElementTransition(transitionProperties: CSSTransitionProperties) {
    const propertiesAsArray = convertPropertiesToArrays(transitionProperties);

    // We have to keep the same order of properties to ensure that transition
    // are applied properly when the transition shorthand is used with different
    // transition properties at the same time
    Object.keys(propertiesAsArray).forEach((key) => {
      const k = key as CSSTransitionProp;

      if (!propertiesAsArray[k]) {
        // @ts-ignore this is correct
        this.element.style[k] = '';
        return;
      }

      switch (k) {
        case 'transition':
          this.element.style.transition = propertiesAsArray[k].join(',');
          break;
        case 'transitionProperty': {
          this.element.style.transitionProperty = propertiesAsArray[k]
            .map(kebabizeCamelCase)
            .join(',');
          break;
        }
        case 'transitionDuration': {
          const maybeDuration = maybeAddSuffixes(propertiesAsArray, k, 'ms');
          if (maybeDuration) {
            this.element.style.transitionDuration = maybeDuration.join(',');
          }
          break;
        }
        case 'transitionDelay': {
          const maybeDelay = maybeAddSuffixes(propertiesAsArray, k, 'ms');
          if (maybeDelay) {
            this.element.style.transitionDelay = maybeDelay.join(',');
          }
          break;
        }
        case 'transitionTimingFunction': {
          this.element.style.transitionTimingFunction = parseTimingFunction(
            propertiesAsArray[k]
          );
          break;
        }
        case 'transitionBehavior': {
          // @ts-ignore this is correct
          this.element.style.transitionBehavior = propertiesAsArray[k]
            .map(kebabizeCamelCase)
            .join(',');
          break;
        }
      }
    });
  }
}
