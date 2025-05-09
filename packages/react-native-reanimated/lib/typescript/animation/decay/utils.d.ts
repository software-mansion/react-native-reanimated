import type { AnimatableValue, Animation, AnimationObject, ReduceMotion, RequiredKeys, Timestamp } from '../../commonTypes';
export declare const VELOCITY_EPS: number;
export declare const SLOPE_FACTOR = 0.1;
export interface DecayAnimation extends Animation<DecayAnimation> {
    lastTimestamp: Timestamp;
    startTimestamp: Timestamp;
    initialVelocity: number;
    velocity: number;
    current: AnimatableValue | undefined;
}
export interface InnerDecayAnimation extends Omit<DecayAnimation, 'current'>, AnimationObject {
    current: number;
    springActive?: boolean;
}
/**
 * The decay animation configuration.
 *
 * @param velocity - Initial velocity of the animation. Defaults to 0.
 * @param deceleration - The rate at which the velocity decreases over time.
 *   Defaults to 0.998.
 * @param clamp - Array of two numbers which restricts animation's range.
 *   Defaults to [].
 * @param velocityFactor - Velocity multiplier. Defaults to 1.
 * @param rubberBandEffect - Makes the animation bounce over the limit specified
 *   in `clamp`. Defaults to `false`.
 * @param rubberBandFactor - Strength of the rubber band effect. Defaults to
 *   0.6.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withDecay#config
 */
export type DecayConfig = {
    deceleration?: number;
    velocityFactor?: number;
    velocity?: number;
    reduceMotion?: ReduceMotion;
} & ({
    rubberBandEffect?: false;
    clamp?: [min: number, max: number];
} | {
    rubberBandEffect: true;
    clamp: [min: number, max: number];
    rubberBandFactor?: number;
});
export type DefaultDecayConfig = RequiredKeys<DecayConfig, 'deceleration' | 'velocityFactor' | 'velocity'> & {
    rubberBandFactor: number;
};
export type RubberBandDecayConfig = RequiredKeys<DefaultDecayConfig, 'clamp'> & {
    rubberBandEffect: true;
};
export declare function isValidRubberBandConfig(config: DefaultDecayConfig): config is RubberBandDecayConfig;
//# sourceMappingURL=utils.d.ts.map