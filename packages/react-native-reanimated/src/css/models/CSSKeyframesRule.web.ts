'use strict';
import type {
  CSSAnimationKeyframes,
  PlainStyle,
  SingleCSSAnimationName,
} from '../types';
import { processKeyframeDefinitions } from '../web/parser/animationParser';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

export const isCSSKeyframesRuleImpl = (
  keyframes: SingleCSSAnimationName
): keyframes is CSSKeyframesRuleImpl => {
  return typeof keyframes === 'object' && 'processedKeyframes' in keyframes;
};

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  private processedKeyframes_: string;

  constructor(
    keyframes: CSSAnimationKeyframes<S>,
    processedKeyframes?: string
  ) {
    super(keyframes);
    this.processedKeyframes_ =
      processedKeyframes ?? processKeyframeDefinitions(keyframes);
  }

  get processedKeyframes(): string {
    return this.processedKeyframes_;
  }
}
