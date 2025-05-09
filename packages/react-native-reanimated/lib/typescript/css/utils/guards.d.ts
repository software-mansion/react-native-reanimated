import type { PredefinedTimingFunction, StepsModifier } from '../easings/types';
import type { AnyRecord, CSSAnimationKeyframes, CSSKeyframesRule, CSSStyleProp, Repeat, TimeUnit } from '../types';
import type { ConfigPropertyAlias } from '../types/config';
export declare const VALID_PREDEFINED_TIMING_FUNCTIONS_SET: Set<string>;
export declare const VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET: Set<string>;
export declare const isPredefinedTimingFunction: (value: string) => value is PredefinedTimingFunction;
export declare const smellsLikeTimingFunction: (value: string) => boolean;
export declare const isAnimationSetting: (key: string) => key is keyof import("../types").SingleCSSAnimationSettings;
export declare const isTransitionProp: (key: string) => key is keyof {
    transitionDuration?: TimeUnit | undefined;
    transitionTimingFunction?: import("../easings/types").CSSTimingFunction | undefined;
    transitionDelay?: TimeUnit | undefined;
    transitionBehavior?: import("../types").CSSTransitionBehavior | undefined;
} | "transitionProperty" | "transition";
export declare const isStepsModifier: (value: string) => value is StepsModifier;
export declare const isCSSStyleProp: (key: string) => key is CSSStyleProp;
export declare const isTimeUnit: (value: unknown) => value is TimeUnit;
export declare const isNumber: (value: unknown) => value is number;
export declare const isPercentage: (value: string | number) => value is `${number}%`;
export declare const isAngleValue: (value: string | number) => value is `${number}deg` | `${number}rad`;
export declare const isDefined: <T>(value: T) => value is NonNullable<T>;
export declare const isRecord: <T extends AnyRecord = AnyRecord>(value: unknown) => value is T;
export declare const isNumberArray: (value: unknown) => value is number[];
export declare const isArrayOfLength: <T, L extends number>(value: T[], length: L) => value is Repeat<T, L>;
export declare const isCSSKeyframesObject: (value: object) => value is CSSAnimationKeyframes;
export declare const isCSSKeyframesRule: (value: object) => value is CSSKeyframesRule;
export declare const isConfigPropertyAlias: <P extends AnyRecord>(value: unknown) => value is ConfigPropertyAlias<P>;
export declare const hasProp: <P extends AnyRecord, K extends string>(obj: P, key: K) => obj is P & Record<K, string>;
//# sourceMappingURL=guards.d.ts.map