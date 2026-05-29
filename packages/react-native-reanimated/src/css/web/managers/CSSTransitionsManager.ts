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

const TRANSITION_EVENT_NAME: Record<CSSTransitionCallbackProp, string> = {
  onTransitionRun: 'transitionrun',
  onTransitionStart: 'transitionstart',
  onTransitionEnd: 'transitionend',
  onTransitionCancel: 'transitioncancel',
};

const CALLBACK_PROPS = Object.keys(
  TRANSITION_EVENT_NAME
) as CSSTransitionCallbackProp[];

export default class CSSTransitionsManager implements ICSSTransitionsManager {
  private readonly element: ReanimatedHTMLElement;
  private isAttached = false;

  private callbacks: CSSTransitionCallbacks = {};
  private readonly attachedHandlers = new Map<
    CSSTransitionCallbackProp,
    EventListener
  >();

  constructor(element: ReanimatedHTMLElement) {
    this.element = element;
  }

  update(
    transitionProperties: CSSTransitionProperties | null,
    callbacks: CSSTransitionCallbacks | null = null
  ) {
    // Keep listeners tied to callback presence (not transition presence) so a
    // `transitioncancel` emitted while detaching still reaches the user.
    this.syncListeners(callbacks ?? {});

    if (!transitionProperties) {
      this.detach();
      return;
    }

    this.setElementTransition(transitionProperties);
    this.isAttached = true;
  }

  unmountCleanup() {
    this.syncListeners({});
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

  private syncListeners(callbacks: CSSTransitionCallbacks) {
    this.callbacks = callbacks;

    for (const prop of CALLBACK_PROPS) {
      const eventName = TRANSITION_EVENT_NAME[prop];
      const hasCallback = typeof callbacks[prop] === 'function';
      const handler = this.attachedHandlers.get(prop);

      if (hasCallback && !handler) {
        const newHandler = this.createHandler(prop);
        this.attachedHandlers.set(prop, newHandler);
        this.element.addEventListener(eventName, newHandler);
      } else if (!hasCallback && handler) {
        this.element.removeEventListener(eventName, handler);
        this.attachedHandlers.delete(prop);
      }
    }
  }

  private createHandler(prop: CSSTransitionCallbackProp): EventListener {
    return (event: Event) => {
      const transitionEvent = event as TransitionEvent;
      // Transition events bubble; only handle this element's own transitions.
      if (transitionEvent.target !== this.element) {
        return;
      }

      const payload: CSSTransitionEvent = {
        propertyName: camelizeKebabCase(transitionEvent.propertyName),
        elapsedTime: transitionEvent.elapsedTime,
      };
      this.callbacks[prop]?.(payload);
    };
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
