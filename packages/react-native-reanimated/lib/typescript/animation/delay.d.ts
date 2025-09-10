import type { AnimatableValue, ReduceMotion } from '../commonTypes';
type withDelayType = <T extends AnimatableValue>(delayMs: number, delayedAnimation: T, reduceMotion?: ReduceMotion) => T;
/**
 * An animation modifier that lets you start an animation with a delay.
 *
 * @param delayMs - Duration (in milliseconds) before the animation starts.
 * @param nextAnimation - The animation to delay.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withDelay
 */
export declare const withDelay: withDelayType;
export {};
//# sourceMappingURL=delay.d.ts.map