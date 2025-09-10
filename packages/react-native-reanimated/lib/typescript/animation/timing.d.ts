import type { AnimatableValue, Animation, AnimationCallback, EasingFunction, ReduceMotion, Timestamp } from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
/**
 * The timing animation configuration.
 *
 * @param duration - Length of the animation (in milliseconds). Defaults to 300.
 * @param easing - An easing function which defines the animation curve.
 *   Defaults to `Easing.inOut(Easing.quad)`.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming#config-
 */
interface TimingConfig {
    duration?: number;
    reduceMotion?: ReduceMotion;
    easing?: EasingFunction | EasingFunctionFactory;
}
export type WithTimingConfig = TimingConfig;
export interface TimingAnimation extends Animation<TimingAnimation> {
    type: string;
    easing: EasingFunction;
    startValue: AnimatableValue;
    startTime: Timestamp;
    progress: number;
    toValue: AnimatableValue;
    current: AnimatableValue;
}
type withTimingType = <T extends AnimatableValue>(toValue: T, userConfig?: TimingConfig, callback?: AnimationCallback) => T;
/**
 * Lets you create an animation based on duration and easing.
 *
 * @param toValue - The value on which the animation will come at rest -
 *   {@link AnimatableValue}.
 * @param config - The timing animation configuration - {@link TimingConfig}.
 * @param callback - A function called on animation complete -
 *   {@link AnimationCallback}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming
 */
export declare const withTiming: withTimingType;
export {};
//# sourceMappingURL=timing.d.ts.map