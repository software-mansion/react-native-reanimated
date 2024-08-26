import type { ViewStyle } from 'react-native';

// TODO: support other keyframe types
export type CSSKeyframeKey = `${number}%` | 'from' | 'to' | number;

// TODO: support other units
export type CSSAnimationDuration = `${number}s` | `${number}ms` | number;

// TODO: support other timing functions
export type CSSAnimationTimingFunction = 'linear' | 'ease-in-out-back';

export type CSSAnimationKeyframes = Partial<Record<CSSKeyframeKey, ViewStyle>>;

export type NormalizedOffsetKeyframe = {
  offset: number;
  style: ViewStyle;
};

export interface CSSAnimationConfig {
  animationName: CSSAnimationKeyframes;
  animationDuration: CSSAnimationDuration;
  animationTimingFunction: CSSAnimationTimingFunction;
}

export type NormalizedCSSAnimationConfig = {
  animationName: KeyframedViewStyle;
  animationDuration: number;
  animationTimingFunction: CSSAnimationTimingFunction;
};

export type KeyframedValue<V> = {
  offset: number;
  value: V;
}[];

export type KeyframedStyle<S> = {
  [P in keyof S]: S[P] extends infer U | undefined
    ? U extends object
      ? U extends Array<infer T>
        ? P extends 'transform'
          ? Array<{ [K in keyof T]: KeyframedValue<T[K]> }>
          : KeyframedValue<U>
        : { [K in keyof U]: KeyframedValue<U[K]> }
      : KeyframedValue<U>
    : never;
};

export type KeyframedViewStyle = KeyframedStyle<ViewStyle>;
