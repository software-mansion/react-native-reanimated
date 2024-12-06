'use strict';
import type { PlainStyleProps, CSSTimeUnit } from './common';
import type {
  CSSTimingFunction,
  NormalizedCSSTimingFunction,
} from '../easings';
import type { AddArrayPropertyTypes } from './helpers';

// BEFORE NORMALIZATION

export type CSSAnimationKeyframeSelector = string | number;
export type CSSAnimationKeyframeBlock<S extends object> = S & {
  animationTimingFunction?: CSSAnimationTimingFunction;
};

export type CSSAnimationKeyframes<S extends object = PlainStyleProps> = Record<
  CSSAnimationKeyframeSelector,
  CSSAnimationKeyframeBlock<S>
>;
export type CSSAnimationDuration = CSSTimeUnit;
export type CSSAnimationTimingFunction = CSSTimingFunction;
export type CSSAnimationDelay = CSSTimeUnit;
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

export type SingleCSSAnimationProperties<S extends object = PlainStyleProps> =
  SingleCSSAnimationSettings & {
    animationName: CSSAnimationKeyframes<S>;
  };

export type CSSAnimationSettings =
  AddArrayPropertyTypes<SingleCSSAnimationSettings>;

export type CSSAnimationProperties<S extends object = PlainStyleProps> =
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

export type NormalizedCSSKeyframesStyle = CreateKeyframesStyle<PlainStyleProps>;
export type NormalizedCSSKeyframeTimingFunctions = Record<
  number,
  NormalizedCSSTimingFunction
>;

export type NormalizedCSSAnimationName = {
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
  NormalizedSingleCSSAnimationSettings & NormalizedCSSAnimationName;
