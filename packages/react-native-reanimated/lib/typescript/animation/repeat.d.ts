import type { AnimatableValue, AnimationCallback, ReduceMotion } from '../commonTypes';
type withRepeatType = <T extends AnimatableValue>(animation: T, numberOfReps?: number, reverse?: boolean, callback?: AnimationCallback, reduceMotion?: ReduceMotion) => T;
/**
 * Lets you repeat an animation given number of times or run it indefinitely.
 *
 * @param animation - An animation object you want to repeat.
 * @param numberOfReps - The number of times the animation is going to be
 *   repeated. Defaults to 2.
 * @param reverse - Whether the animation should run in reverse every other
 *   repetition. Defaults to false.
 * @param callback - A function called on animation complete.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat
 */
export declare const withRepeat: withRepeatType;
export {};
//# sourceMappingURL=repeat.d.ts.map