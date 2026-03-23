'use strict';
import type { UnknownRecord } from '../../../common';
import type { NormalizedCSSTimingFunction } from '../../easing';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationPlayState,
} from '../../types';

type CSSPropKeyframe<V> = {
  offset: number;
  value: V;
}[];

export type PropsWithKeyframes<TProps = UnknownRecord> = {
  [P in keyof TProps]: TProps[P] extends infer U | undefined
    ? U extends object
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        U extends Array<any>
        ? CSSPropKeyframe<U> // If the value is an array, don't iterate over its values and treat it as the end value
        : { [K in keyof U]: PropsWithKeyframes<U[K]> }
      : P extends 'transform' // Don't allow transform to be passed as a string in keyframes
        ? never
        : CSSPropKeyframe<U>
    : never;
};

export type NormalizedCSSKeyframeTimingFunctions = Record<
  number,
  NormalizedCSSTimingFunction
>;

export type NormalizedCSSAnimationKeyframesConfig = {
  propKeyframes: PropsWithKeyframes;
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
  newAnimationSettings?: Record<number, NormalizedSingleCSSAnimationSettings>;
  settingsUpdates?: Record<
    number,
    Partial<NormalizedSingleCSSAnimationSettings>
  >;
};
