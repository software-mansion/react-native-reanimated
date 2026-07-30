'use strict';
import type { CSSAnimationCallbackProp } from '../../types';
import { CSS_EVENT_MASK } from './types';

const ANIMATION_EVENT_BIT_BY_PROP: Record<CSSAnimationCallbackProp, number> = {
  onAnimationStart: CSS_EVENT_MASK.animationStart,
  onAnimationEnd: CSS_EVENT_MASK.animationEnd,
  onAnimationIteration: CSS_EVENT_MASK.animationIteration,
  onAnimationCancel: CSS_EVENT_MASK.animationCancel,
};

export function getAnimationEventMaskFromProps(
  props: Iterable<CSSAnimationCallbackProp>
): number {
  let mask = 0;
  for (const prop of props) {
    mask |= ANIMATION_EVENT_BIT_BY_PROP[prop];
  }
  return mask;
}
