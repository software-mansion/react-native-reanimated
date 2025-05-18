'use strict';
import { CSSKeyframesRuleImpl } from '../models';
import type {
  CSSAnimationKeyframes,
  CSSKeyframesRule,
  PlainStyle,
} from '../types';

export default function keyframes<S extends PlainStyle>(
  // TODO - think of better types
  keyframeDefinitions: CSSAnimationKeyframes<Pick<S, keyof PlainStyle>> &
    CSSAnimationKeyframes<PlainStyle>
): CSSKeyframesRule {
  return new CSSKeyframesRuleImpl(keyframeDefinitions);
}
