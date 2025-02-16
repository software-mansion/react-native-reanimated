'use strict';
import type { CSSTimingFunction } from '../easings';
import type { PlainStyle, TimeUnit } from './common';
import type { AddArrayPropertyType, AddArrayPropertyTypes } from './helpers';

export type CSSRuleList<S extends PlainStyle> = CSSKeyframeRule<S>[];

export interface CSSKeyframeRule<S extends PlainStyle = PlainStyle> {
  readonly keyText: string;
  readonly style: S;
}

export interface CSSKeyframesRule {
  readonly cssRules: CSSAnimationKeyframes;
  readonly cssText: string;
  readonly name: string;

  toString(): string;
}

export type CSSAnimationKeyframeSelector = string | number;
export type CSSAnimationKeyframeBlock<S extends object> = S & {
  animationTimingFunction?: CSSAnimationTimingFunction;
};

export type CSSAnimationKeyframes<S extends object = PlainStyle> = Record<
  CSSAnimationKeyframeSelector,
  CSSAnimationKeyframeBlock<S>
>;
export type CSSAnimationName<S extends object = PlainStyle> =
  | CSSKeyframesRule
  | CSSAnimationKeyframes<S>
  | string;
export type CSSAnimationDuration = TimeUnit;
export type CSSAnimationTimingFunction = CSSTimingFunction;
export type CSSAnimationDelay = TimeUnit;
export type CSSAnimationIterationCount = 'infinite' | number;
export type CSSAnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';
export type CSSAnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
export type CSSAnimationPlayState = 'running' | 'paused';
export type CSSAnimationShorthand = string;

export type SingleCSSAnimationSettings = {
  animationDuration?: CSSAnimationDuration;
  animationTimingFunction?: CSSAnimationTimingFunction;
  animationDelay?: CSSAnimationDelay;
  animationIterationCount?: CSSAnimationIterationCount;
  animationDirection?: CSSAnimationDirection;
  animationFillMode?: CSSAnimationFillMode;
  animationPlayState?: CSSAnimationPlayState;
  // animationTimeline?: // TODO - This is still experimental in browsers and we might not want to support it when CSS animations in reanimated are released
};

export type SingleCSSAnimationProperties<S extends object = PlainStyle> =
  SingleCSSAnimationSettings & {
    animationName: CSSAnimationName<S>;
  };

export type CSSAnimationSettings =
  AddArrayPropertyTypes<SingleCSSAnimationSettings>;

export type CSSAnimationProperties<S extends object = PlainStyle> =
  CSSAnimationSettings & {
    animationName?: AddArrayPropertyType<CSSAnimationName<S>>;
    animation?: CSSAnimationShorthand;
  };

export type CSSAnimationProp = keyof CSSAnimationProperties;
