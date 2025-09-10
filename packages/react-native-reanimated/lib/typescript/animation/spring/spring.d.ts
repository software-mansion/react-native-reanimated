import type { AnimatableValue, AnimationCallback } from '../../commonTypes';
import type { SpringConfig } from './springConfigs';
type withSpringType = <T extends AnimatableValue>(toValue: T, userConfig?: SpringConfig, callback?: AnimationCallback) => T;
/**
 * Lets you create spring-based animations.
 *
 * @param toValue - The value at which the animation will come to rest -
 *   {@link AnimatableValue}
 * @param config - The spring animation configuration - {@link SpringConfig}.
 *   Defaults to {@link GentleSpringConfig}. You can use other predefined spring
 *   configurations, such as {@link WigglySpringConfig},
 *   {@link SnappySpringConfig}, {@link Reanimated3DefaultSpringConfig} or create
 *   your own.
 * @param callback - A function called on animation complete -
 *   {@link AnimationCallback}
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring
 */
export declare const withSpring: withSpringType;
export {};
//# sourceMappingURL=spring.d.ts.map