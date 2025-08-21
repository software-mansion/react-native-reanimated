'use strict';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type {
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { kebabizeCamelCase } from '../../utils';
import { normalizeCSSTransitionProperties } from '../normalization';
import { maybeAddSuffixes, parseTimingFunction } from '../utils';

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly element: ReanimatedHTMLElement;
  private isAttached = false;

  constructor(element: ReanimatedHTMLElement) {
    this.element = element;
  }

  update(transitionProperties: CSSTransitionProperties | null) {
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

  private detach() {
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

  private setElementTransition(transitionProperties: CSSTransitionProperties) {
    const normalizedProps =
      normalizeCSSTransitionProperties(transitionProperties);

    this.element.style.transitionProperty = normalizedProps.transitionProperty
      .map(kebabizeCamelCase)
      .join(',');

    this.element.style.transitionDuration = maybeAddSuffixes(
      normalizedProps,
      'transitionDuration',
      'ms'
    ).join(',');

    this.element.style.transitionDelay = maybeAddSuffixes(
      normalizedProps,
      'transitionDelay',
      'ms'
    ).join(',');

    this.element.style.transitionTimingFunction = parseTimingFunction(
      normalizedProps.transitionTimingFunction
    );

    // @ts-ignore this is correct
    this.element.style.transitionBehavior = normalizedProps.transitionBehavior
      .map(kebabizeCamelCase)
      .join(',');
  }
}
