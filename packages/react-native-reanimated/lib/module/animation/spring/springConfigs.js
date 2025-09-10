'use strict';

export const Reanimated3DefaultSpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100
};
export const Reanimated3DefaultSpringConfigWithDuration = {
  duration: 1333,
  dampingRatio: 0.5
};
export const WigglySpringConfig = {
  damping: 90,
  mass: 4,
  stiffness: 900
};
export const WigglySpringConfigWithDuration = {
  duration: 550,
  dampingRatio: 0.75
};
export const GentleSpringConfig = {
  damping: 120,
  mass: 4,
  stiffness: 900
};
export const GentleSpringConfigWithDuration = {
  duration: 550,
  dampingRatio: 1
};
export const SnappySpringConfig = {
  damping: 110,
  mass: 4,
  stiffness: 900,
  overshootClamping: true
};
export const SnappySpringConfigWithDuration = {
  duration: 550,
  dampingRatio: 0.92,
  overshootClamping: true
};

/**
 * Spring animation configuration.
 *
 * @param mass - The weight of the spring. Reducing this value makes the
 *   animation faster. Defaults to 4.
 * @param damping - How quickly a spring slows down. Higher damping means the
 *   spring will come to rest faster. Defaults to 120.
 * @param stiffness - How bouncy the spring is. Defaults to 900.
 * @param duration - Perceptual duration of the animation in milliseconds.
 *   Actual duration is 1.5 times the value of perceptual duration. Defaults to
 *   550ms if `dampingRatio` is provided.
 * @param dampingRatio - How damped the spring is. Value `1` means the spring is
 *   critically damped, value `<1` means the spring is underdamped and value
 *   `>1` means the spring is overdamped. Defaults to 1 if `duration` is
 *   provided.
 * @param velocity - Initial velocity applied to the spring equation. Defaults
 *   to 0.
 * @param overshootClamping - Whether a spring can bounce over the `toValue`.
 *   Defaults to false.
 * @param energyThreshold - Relative energy threshold below which the spring
 *   will snap to `toValue` without further oscillations. Defaults to 6e-9.
 * @param reduceMotion - Determines how the animation responds to the device's
 *   reduced motion accessibility setting. Default to `ReduceMotion.System` -
 *   {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/#config-
 */
//# sourceMappingURL=springConfigs.js.map