'use strict';
import type { PlainStyle } from '../../common';
import { CSSKeyframesRuleImpl } from '../platform';
import type { CSSAnimationKeyframes, CSSKeyframesRule } from '../types';

export default function keyframes<S extends PlainStyle>(
  // TODO - think of better types
  keyframeDefinitions: CSSAnimationKeyframes<Pick<S, keyof PlainStyle>> &
    CSSAnimationKeyframes<PlainStyle>
): CSSKeyframesRule {
  return new CSSKeyframesRuleImpl(keyframeDefinitions);
}
