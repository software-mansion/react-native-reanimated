'use strict';

import { IS_WEB } from "../../common/index.js";
export const VELOCITY_EPS = IS_WEB ? 1 / 20 : 1;
export const SLOPE_FACTOR = 0.1;

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

// If user wants to use rubber band decay animation we have to make sure he has provided clamp

export function isValidRubberBandConfig(config) {
  'worklet';

  return !!config.rubberBandEffect && Array.isArray(config.clamp) && config.clamp.length === 2;
}
//# sourceMappingURL=utils.js.map