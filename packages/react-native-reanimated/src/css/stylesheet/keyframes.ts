'use strict';
import { CSSKeyframesRuleImpl } from '../platform';
import type { CSSAnimationKeyframes, CSSKeyframesRule } from '../types';

export default function keyframes<S extends object>(
  keyframeDefinitions: CSSAnimationKeyframes<S>
): CSSKeyframesRule {
  return new CSSKeyframesRuleImpl(keyframeDefinitions);
}
