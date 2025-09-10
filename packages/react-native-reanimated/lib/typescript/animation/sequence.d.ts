import type { AnimatableValue, ReduceMotion } from '../commonTypes';
/**
 * Lets you run animations in a sequence.
 *
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @param animations - Any number of animation objects to be run in a sequence.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation/
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence
 */
export declare function withSequence<T extends AnimatableValue>(_reduceMotion: ReduceMotion, ...animations: T[]): T;
export declare function withSequence<T extends AnimatableValue>(...animations: T[]): T;
//# sourceMappingURL=sequence.d.ts.map