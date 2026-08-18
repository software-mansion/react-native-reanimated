'use strict';
import type {
  CSSAnimationCallbackProp,
  CSSTransitionCallbackProp,
} from '../../types';
import type { CSSAnimationEventType, CSSTransitionEventType } from './types';
import { CSS_EVENT_MASK } from './types';

export const ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE = {
  animationStart: 'onCSSAnimationStart',
  animationEnd: 'onCSSAnimationEnd',
  animationIteration: 'onCSSAnimationIteration',
  animationCancel: 'onCSSAnimationCancel',
} as const satisfies Record<CSSAnimationEventType, CSSAnimationCallbackProp>;

export const TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE = {
  transitionRun: 'onCSSTransitionRun',
  transitionStart: 'onCSSTransitionStart',
  transitionEnd: 'onCSSTransitionEnd',
  transitionCancel: 'onCSSTransitionCancel',
} as const satisfies Record<CSSTransitionEventType, CSSTransitionCallbackProp>;

/** Inverse of a prop table, so each pairing is written down only once. */
type EventTypeByProp<M extends Record<string, string>> = {
  [T in keyof M as M[T] & string]: T;
};

function invertPropTable<const M extends Record<string, string>>(map: M) {
  return Object.fromEntries(
    Object.entries(map).map(([type, prop]) => [prop, type])
  ) as EventTypeByProp<M>;
}

const ANIMATION_EVENT_TYPE_BY_PROP = invertPropTable(
  ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE
);
const TRANSITION_EVENT_TYPE_BY_PROP = invertPropTable(
  TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE
);

export function getAnimationEventMaskFromProps(
  props: Iterable<CSSAnimationCallbackProp>
): number {
  let mask = 0;
  for (const prop of props) {
    mask |= CSS_EVENT_MASK[ANIMATION_EVENT_TYPE_BY_PROP[prop]];
  }
  return mask;
}

export function getTransitionEventMaskFromProps(
  props: Iterable<CSSTransitionCallbackProp>
): number {
  let mask = 0;
  for (const prop of props) {
    mask |= CSS_EVENT_MASK[TRANSITION_EVENT_TYPE_BY_PROP[prop]];
  }
  return mask;
}
