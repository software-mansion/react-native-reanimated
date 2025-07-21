'use strict';
import type { CSSTimingFunction } from '../easings';
import type { PlainStyle, TimeUnit } from './common';
import type { AddArrayPropertyType, AddArrayPropertyTypes } from './helpers';

export interface CSSKeyframesRule {
  readonly cssRules: CSSAnimationKeyframes;
  readonly cssText: string;
  readonly length: number;
  readonly name: string;
}

export type CSSAnimationKeyframeSelector = string | number;
export type CSSAnimationKeyframeBlock<S extends object> = S & {
  animationTimingFunction?: CSSAnimationTimingFunction;
};

export type CSSAnimationKeyframes<S extends object = PlainStyle> = Record<
  CSSAnimationKeyframeSelector,
  CSSAnimationKeyframeBlock<S>
>;
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
    animationName: CSSKeyframesRule | CSSAnimationKeyframes<S>;
  };

export type CSSAnimationSettings =
  AddArrayPropertyTypes<SingleCSSAnimationSettings>;

export type CSSAnimationProperties<S extends object = PlainStyle> =
  CSSAnimationSettings & {
    animationName:
      | AddArrayPropertyType<CSSKeyframesRule | CSSAnimationKeyframes<S>>
      | 'none';
  };

export type ExistingCSSAnimationProperties<S extends object = PlainStyle> =
  CSSAnimationProperties<S> & {
    animationName: AddArrayPropertyType<
      CSSKeyframesRule | CSSAnimationKeyframes<S>
    >;
  };

export type CSSAnimationProp = keyof CSSAnimationProperties;
