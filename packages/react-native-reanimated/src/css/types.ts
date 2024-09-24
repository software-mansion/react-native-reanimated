import type { ViewStyle } from 'react-native';
import type {
  CubicBezierEasingConfig,
  LinearEasingConfig,
  StepsEasingConfig,
} from './parametrizedEasings/types';

export type CSSKeyframeKey = `${number}%` | 'from' | 'to' | number;

export type CSSAnimationKeyframes = Partial<Record<CSSKeyframeKey, ViewStyle>>;

export type CSSAnimationTimeUnit = `${number}s` | `${number}ms` | number;

export type CSSAnimationTimingFunction =
  | 'linear'
  | 'ease'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'stepStart'
  | 'stepEnd'
  | CubicBezierEasingConfig
  | LinearEasingConfig
  | StepsEasingConfig;

export type CSSAnimationIterationCount = 'infinite' | number;

export type CSSAnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';

export type CSSAnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';

export type NormalizedOffsetKeyframe = {
  offset: number;
  style: ViewStyle;
};

export interface CSSAnimationConfig {
  animationName: CSSAnimationKeyframes;
  animationDuration?: CSSAnimationTimeUnit;
  animationTimingFunction?: CSSAnimationTimingFunction;
  animationDelay?: CSSAnimationTimeUnit;
  animationIterationCount?: CSSAnimationIterationCount;
  animationDirection?: CSSAnimationDirection;
  animationFillMode?: CSSAnimationFillMode;
  // animationPlayState?: // TODO
  // This is still experimental in browsers and we might not want to support it
  // when CSS animations in reanimated are released
  // animationTimeline?: // TODO
}

export type NormalizedCSSAnimationConfig = {
  animationName: KeyframedViewStyle;
  animationDuration: number;
  animationTimingFunction: CSSAnimationTimingFunction;
  animationDelay: number;
  animationIterationCount: number;
  animationDirection: CSSAnimationDirection;
  animationFillMode: CSSAnimationFillMode;
};

export type NormalizedCSSTransitionConfig = {
  transitionProperty: string[];
  transitionDuration: number;
  transitionTimingFunction: CSSAnimationTimingFunction;
  transitionDelay: number;
};

export type KeyframedValue<V> = {
  offset: number;
  value: V;
}[];

type KeyframedStyle<S> = {
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

export type TemporaryTransforms = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transforms: Record<string, KeyframedValue<any>>;
  previousTransformOffset: number;
};

export type CSSTransitionProperty =
  | 'all'
  | 'none'
  | keyof ViewStyle
  | (keyof ViewStyle)[];

export interface CSSTransitionConfig {
  transitionProperty: CSSTransitionProperty;
  transitionDuration?: CSSAnimationTimeUnit;
  transitionTimingFunction?: CSSAnimationTimingFunction;
  transitionDelay?: CSSAnimationTimeUnit;
  // transitionBehavior?: TODO not sure if we want to include it as we can already work with discrete values
}
