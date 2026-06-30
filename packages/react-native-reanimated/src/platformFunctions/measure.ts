'use strict';
import { IS_JEST, logger } from '../common';
import type { InstanceOrElement, MeasuredDimensions } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';

type Measure = <TRef extends InstanceOrElement>(
  animatedRef: AnimatedRef<TRef>
) => MeasuredDimensions | null;

/**
 * Lets you synchronously get the dimensions and position of a view on the
 * screen.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to get the measurements from.
 * @returns An object containing component measurements or null when the
 *   measurement couldn't be performed- {@link MeasuredDimensions}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure/
 */
export let measure: Measure;

function measureJest() {
  logger.warn('measure() cannot be used with Jest.');
  return null;
}

function measureDefault() {
  logger.warn('measure() is not supported on this configuration.');
  return null;
}

if (IS_JEST) {
  measure = measureJest;
} else {
  measure = measureDefault;
}
