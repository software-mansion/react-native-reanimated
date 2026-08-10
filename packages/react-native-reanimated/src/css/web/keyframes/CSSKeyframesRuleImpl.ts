'use strict';
import type { DefaultStyle } from '../../../hook/commonTypes';
import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes } from '../../types';
import { processKeyframeDefinitions } from '../animationParser';

export default class CSSKeyframesRuleImpl<
  S extends object = DefaultStyle,
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
