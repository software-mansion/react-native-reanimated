'use strict';
import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes, PlainStyle } from '../../types';
import { processKeyframeDefinitions } from '../animationParser';

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
