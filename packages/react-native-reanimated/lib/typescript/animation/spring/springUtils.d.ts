import type { AnimatableValue, Animation, Timestamp } from '../../commonTypes';
import type { SpringConfig } from './springConfigs';
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
    initialEnergy: number;
}
export interface InnerSpringAnimation extends Omit<SpringAnimation, 'toValue' | 'current'> {
    toValue: number;
    current: number;
}
export declare function checkIfConfigIsValid(config: DefaultSpringConfig): boolean;
export declare function initialCalculations(stiffness: number | undefined, config: DefaultSpringConfig & SpringConfigInner): {
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
export declare function getEnergy(displacement: number, velocity: number, stiffness: number, mass: number): number;
/** Runs before initial */
export declare function calculateNewStiffnessToMatchDuration(x0: number, config: DefaultSpringConfig & SpringConfigInner, v0: number): number;
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
export declare function isAnimationTerminatingCalculation(animation: InnerSpringAnimation, config: DefaultSpringConfig & SpringConfigInner): boolean;
//# sourceMappingURL=springUtils.d.ts.map