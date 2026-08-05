'use strict';
import { camelizeKebabCase, kebabizeCamelCase } from '../../../common';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type {
  CSSTransitionCallbackProp,
  CSSTransitionCallbacks,
  CSSTransitionEvent,
  CSSTransitionProperties,
  ICSSTransitionsManager,
} from '../../types';
import { normalizeCSSTransitionProperties } from '../normalization';
import { maybeAddSuffixes, parseTimingFunction } from '../utils';
import { CSSCallbackListeners } from './CSSCallbackListeners';

const TRANSITION_EVENT_NAME: Record<CSSTransitionCallbackProp, string> = {
  onTransitionRun: 'transitionrun',
  onTransitionStart: 'transitionstart',
  onTransitionEnd: 'transitionend',
  onTransitionCancel: 'transitioncancel',
};

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly element: ReanimatedHTMLElement;
  private isAttached = false;

  private readonly callbackListeners: CSSCallbackListeners<
    CSSTransitionCallbackProp,
    CSSTransitionEvent
  >;

  constructor(element: ReanimatedHTMLElement) {
    this.element = element;
    this.callbackListeners = new CSSCallbackListeners<
      CSSTransitionCallbackProp,
      CSSTransitionEvent
    >(element, TRANSITION_EVENT_NAME, (event) => {
      const transitionEvent = event as TransitionEvent;
      return {
        propertyName: camelizeKebabCase(transitionEvent.propertyName),
        elapsedTime: transitionEvent.elapsedTime,
      };
    });
  }

  update(
    transitionProperties: CSSTransitionProperties | null,
    callbacks: CSSTransitionCallbacks | null = null
  ) {
    // Keep listeners tied to callback presence (not transition presence) so a
    // `transitioncancel` emitted while detaching still reaches the user.
    this.callbackListeners.sync(callbacks ?? {});

    if (!transitionProperties) {
      this.detach();
      return;
    }

    this.setElementTransition(transitionProperties);
    this.isAttached = true;
  }

  unmountCleanup() {
    this.callbackListeners.detach();
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
