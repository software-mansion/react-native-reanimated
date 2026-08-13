'use strict';
import type { CSSAnimationCallbackProp } from '../../types';
import type { CSSAnimationEventType } from './types';
import { CSS_EVENT_MASK } from './types';

export const ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE = {
  animationStart: 'onAnimationStart',
  animationEnd: 'onAnimationEnd',
  animationIteration: 'onAnimationIteration',
  animationCancel: 'onAnimationCancel',
} as const satisfies Record<CSSAnimationEventType, CSSAnimationCallbackProp>;

type PropByEventType = typeof ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE;

/** Inverse of the table above, so the pairing is written down only once. */
type EventTypeByProp = {
  [T in keyof PropByEventType as PropByEventType[T]]: T;
};

const EVENT_TYPE_BY_PROP = Object.fromEntries(
  Object.entries(ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE).map(([type, prop]) => [
    prop,
    type,
  ])
) as EventTypeByProp;

export function getAnimationEventMaskFromProps(
  props: Iterable<CSSAnimationCallbackProp>
): number {
  let mask = 0;
  for (const prop of props) {
    mask |= CSS_EVENT_MASK[EVENT_TYPE_BY_PROP[prop]];
  }
  return mask;
}
