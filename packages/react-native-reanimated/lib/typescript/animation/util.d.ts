import type { AnimatableValue, AnimationObject, EasingFunction, SharedValue } from '../commonTypes';
import { ReduceMotion } from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import type { StyleLayoutAnimation } from './commonTypes';
export declare function isValidLayoutAnimationProp(prop: string): boolean;
export declare function assertEasingIsWorklet(easing: EasingFunction | EasingFunctionFactory): void;
export declare function initialUpdaterRun<T>(updater: () => T): T;
interface RecognizedPrefixSuffix {
    prefix?: string;
    suffix?: string;
    strippedValue: number;
}
export declare function recognizePrefixSuffix(value: string | number): RecognizedPrefixSuffix;
export declare function getReduceMotionFromConfig(config?: ReduceMotion): boolean;
/**
 * Returns the value that should be assigned to `animation.reduceMotion` for a
 * given config. If the config is not defined, `undefined` is returned.
 */
export declare function getReduceMotionForAnimation(config?: ReduceMotion): boolean | undefined;
type AnimationToDecoration<T extends AnimationObject | StyleLayoutAnimation, U extends AnimationObject | StyleLayoutAnimation> = T extends StyleLayoutAnimation ? Record<string, unknown> : U | (() => U) | AnimatableValue;
export declare function defineAnimation<T extends AnimationObject | StyleLayoutAnimation, // type that's supposed to be returned
U extends AnimationObject | StyleLayoutAnimation = T>(starting: AnimationToDecoration<T, U>, factory: () => T): T;
declare function cancelAnimationWeb<TValue>(sharedValue: SharedValue<TValue>): void;
/**
 * Lets you cancel a running animation paired to a shared value. The
 * cancellation is asynchronous.
 *
 * @param sharedValue - The shared value of a running animation that you want to
 *   cancel.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation
 */
export declare const cancelAnimation: typeof cancelAnimationWeb;
export {};
//# sourceMappingURL=util.d.ts.map