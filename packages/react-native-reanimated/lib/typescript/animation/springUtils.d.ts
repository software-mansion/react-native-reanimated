import type { AnimatableValue, Animation, ReduceMotion, Timestamp } from '../commonTypes';
/**
 * Spring animation configuration.
 *
 * @param mass - The weight of the spring. Reducing this value makes the
 *   animation faster. Defaults to 1.
 * @param damping - How quickly a spring slows down. Higher damping means the
 *   spring will come to rest faster. Defaults to 10.
 * @param duration - Length of the animation (in milliseconds). Defaults to
 *   2000.
 * @param dampingRatio - How damped the spring is. Value 1 means the spring is
 *   critically damped, and value `>`1 means the spring is overdamped. Defaults
 *   to 0.5.
 * @param stiffness - How bouncy the spring is. Defaults to 100.
 * @param velocity - Initial velocity applied to the spring equation. Defaults
 *   to 0.
 * @param overshootClamping - Whether a spring can bounce over the `toValue`.
 *   Defaults to false.
 * @param restDisplacementThreshold - The displacement below which the spring
 *   will snap to toValue without further oscillations. Defaults to 0.01.
 * @param restSpeedThreshold - The speed in pixels per second from which the
 *   spring will snap to toValue without further oscillations. Defaults to 2.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/#config-
 */
export type SpringConfig = {
    stiffness?: number;
    overshootClamping?: boolean;
    restDisplacementThreshold?: number;
    restSpeedThreshold?: number;
    velocity?: number;
    reduceMotion?: ReduceMotion;
} & ({
    mass?: number;
    damping?: number;
    duration?: never;
    dampingRatio?: never;
    clamp?: never;
} | {
    mass?: never;
    damping?: never;
    duration?: number;
    dampingRatio?: number;
    clamp?: {
        min?: number;
        max?: number;
    };
});
export type DefaultSpringConfig = {
    [K in keyof Required<SpringConfig>]: K extends 'reduceMotion' | 'clamp' ? Required<SpringConfig>[K] | undefined : Required<SpringConfig>[K];
};
export type WithSpringConfig = SpringConfig;
export interface SpringConfigInner {
    useDuration: boolean;
    skipAnimation: boolean;
}
export interface SpringAnimation extends Animation<SpringAnimation> {
    current: AnimatableValue;
    toValue: AnimatableValue;
    velocity: number;
    lastTimestamp: Timestamp;
    startTimestamp: Timestamp;
    startValue: number;
    zeta: number;
    omega0: number;
    omega1: number;
}
export interface InnerSpringAnimation extends Omit<SpringAnimation, 'toValue' | 'current'> {
    toValue: number;
    current: number;
}
export declare function checkIfConfigIsValid(config: DefaultSpringConfig): boolean;
export declare function bisectRoot({ min, max, func, maxIterations, }: {
    min: number;
    max: number;
    func: (x: number) => number;
    maxIterations?: number;
}): number;
export declare function initialCalculations(mass: number | undefined, config: DefaultSpringConfig & SpringConfigInner): {
    zeta: number;
    omega0: number;
    omega1: number;
};
/**
 * We make an assumption that we can manipulate zeta without changing duration
 * of movement. According to theory this change is small and tests shows that we
 * can indeed ignore it.
 */
export declare function scaleZetaToMatchClamps(animation: SpringAnimation, clamp: {
    min?: number;
    max?: number;
}): number;
/** Runs before initial */
export declare function calculateNewMassToMatchDuration(x0: number, config: DefaultSpringConfig & SpringConfigInner, v0: number): number;
export declare function criticallyDampedSpringCalculations(animation: InnerSpringAnimation, precalculatedValues: {
    v0: number;
    x0: number;
    omega0: number;
    t: number;
}): {
    position: number;
    velocity: number;
};
export declare function underDampedSpringCalculations(animation: InnerSpringAnimation, precalculatedValues: {
    zeta: number;
    v0: number;
    x0: number;
    omega0: number;
    omega1: number;
    t: number;
}): {
    position: number;
    velocity: number;
};
export declare function isAnimationTerminatingCalculation(animation: InnerSpringAnimation, config: DefaultSpringConfig): {
    isOvershooting: boolean;
    isVelocity: boolean;
    isDisplacement: boolean;
};
//# sourceMappingURL=springUtils.d.ts.map