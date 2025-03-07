'use strict';
import type { NormalizedCSSTimingFunction } from '../../../easings';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationPlayState,
  PlainStyle,
} from '../../../types';

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

export type NormalizedCSSAnimationKeyframesConfig = {
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

export type CSSAnimationUpdates = {
  animationNames?: string[];
  newAnimationSettings?: Record<string, NormalizedSingleCSSAnimationSettings>;
  settingsUpdates?: Record<
    string,
    Partial<NormalizedSingleCSSAnimationSettings>
  >;
};
