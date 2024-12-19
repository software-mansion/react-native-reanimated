'use strict';
import type { PlainStyle, TimeUnit } from './common';
import type {
  CSSTimingFunction,
  NormalizedCSSTimingFunction,
} from '../easings';
import type { AddArrayPropertyTypes } from './helpers';
import type { CSSKeyframesRule } from './models';

// BEFORE NORMALIZATION

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
  | 'alternateReverse';
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

export type SingleCSSAnimationName<S extends object = PlainStyle> =
  | CSSKeyframesRule
  | CSSAnimationKeyframes<S>;

export type SingleCSSAnimationProperties<S extends object = PlainStyle> =
  SingleCSSAnimationSettings & {
    animationName: SingleCSSAnimationName<S>;
  };

export type CSSAnimationSettings =
  AddArrayPropertyTypes<SingleCSSAnimationSettings>;

export type CSSAnimationProperties<S extends object = PlainStyle> =
  AddArrayPropertyTypes<SingleCSSAnimationProperties<S>>;

export type AnimationSettingProp = keyof CSSAnimationSettings;

// AFTER NORMALIZATION

type CSSKeyframesStyleValue<V> = {
  offset: number;
  value: V;
}[];

type CreateKeyframesStyle<S> = {
  [P in keyof S]: S[P] extends infer U | undefined
    ? U extends object
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        U extends Array<any>
        ? CSSKeyframesStyleValue<U> // If the value is an array, don't iterate over its values and treat it as the end value
        : { [K in keyof U]: CreateKeyframesStyle<U[K]> }
      : P extends 'transform' // Don't allow transform to be passed as a string in keyframes
        ? never
        : CSSKeyframesStyleValue<U>
    : never;
};

export type NormalizedCSSKeyframesStyle = CreateKeyframesStyle<PlainStyle>;
export type NormalizedCSSKeyframeTimingFunctions = Record<
  number,
  NormalizedCSSTimingFunction
>;

export type NormalizedCSSAnimationKeyframes = {
  keyframesStyle: NormalizedCSSKeyframesStyle;
  keyframeTimingFunctions: NormalizedCSSKeyframeTimingFunctions;
};

export type NormalizedSingleCSSAnimationSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
  iterationCount: number;
  direction: CSSAnimationDirection;
  fillMode: CSSAnimationFillMode;
  playState: CSSAnimationPlayState;
};

export type NormalizedSingleCSSAnimationConfig =
  NormalizedSingleCSSAnimationSettings & NormalizedCSSAnimationKeyframes;
