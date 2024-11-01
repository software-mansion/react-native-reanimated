'use strict';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import type { CSSTimeUnit } from './common';
import type { CSSTimingFunction, NormalizedCSSTimingFunction } from '../easing';

export type CSSKeyframeValue<V> = {
  offset: number;
  value: V;
}[];

type CreateKeyframeStyle<S> = {
  [P in keyof S]: S[P] extends infer U | undefined
    ? U extends object
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        U extends Array<any>
        ? CSSKeyframeValue<U> // If the value is an array, don't iterate over its values and treat it as the end value
        : { [K in keyof U]: CSSKeyframeValue<U[K]> }
      : P extends 'transform' // Don't allow transform to be passed as a string in keyframes
        ? never
        : CSSKeyframeValue<U>
    : never;
};

export type CSSKeyframeViewStyle = CreateKeyframeStyle<
  ViewStyle & TextStyle & ImageStyle
>;

// BEFORE NORMALIZATION

export type CSSAnimationKeyframeOffset = `${number}%` | 'from' | 'to' | number;
export type CSSAnimationKeyframes = Partial<
  Record<CSSAnimationKeyframeOffset, ViewStyle & TextStyle & ImageStyle>
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
