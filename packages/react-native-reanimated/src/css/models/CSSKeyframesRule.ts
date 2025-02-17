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
  /**
   * Host object used for cleanup in C++.
   *
   * @remarks
   *   Currently only used for object cleanup in C++. In the future, we may add
   *   support for modifying the C++ keyframes object, similar to the Web
   *   Animations API.
   */
  #hostObject: CSSKeyframesHostObject;

  constructor(keyframes: CSSAnimationKeyframes<S>) {
    super(keyframes);
    this.normalizedKeyframes_ = normalizeAnimationKeyframes(keyframes);
    this.#hostObject = registerCSSKeyframes(
      this.name,
      this.normalizedKeyframes_
    );
  }

  get normalizedKeyframesConfig(): NormalizedCSSAnimationKeyframesConfig {
    return this.normalizedKeyframes_;
  }
}
