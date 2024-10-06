'use strict';
import type { ViewStyle } from 'react-native';
import type { CSSTimeUnit } from './common';
import type { CSSTimingFunction, NormalizedCSSTimingFunction } from '../easing';

export type CSSKeyframeValue<V> = {
  offset: number;
  value: V;
}[];

type CreateKeyframeStyle<S> = {
  [P in keyof S]: S[P] extends infer U | undefined
    ? U extends object
      ? U extends Array<infer T>
        ? P extends 'transform'
          ? Array<{ [K in keyof T]: CSSKeyframeValue<T[K]> }>
          : CSSKeyframeValue<U>
        : { [K in keyof U]: CSSKeyframeValue<U[K]> }
      : CSSKeyframeValue<U>
    : never;
};

export type CSSKeyframeViewStyle = CreateKeyframeStyle<ViewStyle>;

// BEFORE NORMALIZATION

export type CSSAnimationKeyframeKey = `${number}%` | 'from' | 'to' | number;
export type CSSAnimationKeyframes = Partial<
  Record<CSSAnimationKeyframeKey, ViewStyle>
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

export type CSSAnimationSettings = {
  animationDuration?: CSSAnimationDuration;
  animationTimingFunction?: CSSAnimationTimingFunction;
  animationDelay?: CSSAnimationDelay;
  animationIterationCount?: CSSAnimationIterationCount;
  animationDirection?: CSSAnimationDirection;
  animationFillMode?: CSSAnimationFillMode;
  animationPlayState?: CSSAnimationPlayState;
  // animationTimeline?: // TODO - This is still experimental in browsers and we might not want to support it when CSS animations in reanimated are released
};

export type CSSAnimationConfig = CSSAnimationSettings & {
  animationName: CSSAnimationKeyframes;
};

export type AnimationSettingProp = keyof CSSAnimationSettings;

// AFTER NORMALIZATION

export type NormalizedCSSAnimationKeyframe = {
  offset: number;
  style: ViewStyle;
};

export type NormalizedCSSAnimationSettings = {
  animationDuration: number;
  animationTimingFunction: NormalizedCSSTimingFunction;
  animationDelay: number;
  animationIterationCount: number;
  animationDirection: CSSAnimationDirection;
  animationFillMode: CSSAnimationFillMode;
  animationPlayState: CSSAnimationPlayState;
};

export type NormalizedCSSAnimationConfig = NormalizedCSSAnimationSettings & {
  animationName: CSSKeyframeViewStyle;
};
