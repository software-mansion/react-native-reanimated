'use strict';
import type {
  CSSKeyframesHostObject,
  NormalizedCSSAnimationKeyframesConfig,
} from '../platform/native';
import {
  normalizeAnimationKeyframes,
  registerCSSKeyframes,
} from '../platform/native';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';

export default class CSSKeyframesRuleImpl<
  S extends PlainStyle = PlainStyle,
> extends CSSKeyframesRuleBase<S> {
  private normalizedKeyframes_: NormalizedCSSAnimationKeyframesConfig;
  // For now, this object is used only for object cleanup in cpp
  // (we may add a possibility to modify the cpp keyframes object
  // in the future, as we can do in the web animations api)
  private hostObject_: CSSKeyframesHostObject;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    super(keyframes);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
    this.hostObject_ = registerCSSKeyframes(
      this.name,
      this.normalizedKeyframes_
    );
  }

  get normalizedKeyframesConfig(): NormalizedCSSAnimationKeyframesConfig {
    return this.normalizedKeyframes_;
  }
}
