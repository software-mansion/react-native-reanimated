import type { AnimationCallback } from '../../commonTypes';
import type { DecayConfig } from './utils';
export type WithDecayConfig = DecayConfig;
type withDecayType = (userConfig: DecayConfig, callback?: AnimationCallback) => number;
/**
 * Lets you create animations that mimic objects in motion with friction.
 *
 * @param config - The decay animation configuration - {@link DecayConfig}.
 * @param callback - A function called upon animation completion -
 *   {@link AnimationCallback}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withDecay
 */
export declare const withDecay: withDecayType;
export {};
//# sourceMappingURL=decay.d.ts.map