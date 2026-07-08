'use strict';
import { RuntimeKind } from 'react-native-worklets';

import type { AnimationObject, EasingFunction } from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import type { StyleLayoutAnimation } from './commonTypes';
import type { AnimationToDecoration } from './utilBase';
import {
  cancelAnimationWeb,
  decorateAnimation,
  IN_STYLE_UPDATER,
} from './utilBase';

export {
  getReduceMotionForAnimation,
  getReduceMotionFromConfig,
  initialUpdaterRun,
  isValidLayoutAnimationProp,
  recognizePrefixSuffix,
} from './utilBase';

export function assertEasingIsWorklet(
  _easing: EasingFunction | EasingFunctionFactory
): void {
  'worklet';
  return;
}

export function defineAnimation<
  T extends AnimationObject | StyleLayoutAnimation, // type that's supposed to be returned
  U extends AnimationObject | StyleLayoutAnimation = T, // type that's received
>(starting: AnimationToDecoration<T, U>, factory: () => T): T {
  'worklet';
  if (
    globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative &&
    IN_STYLE_UPDATER.current
  ) {
    return starting as unknown as T;
  }
  const create = () => {
    'worklet';
    const animation = factory();
    decorateAnimation<U>(animation as unknown as U);
    return animation;
  };

  return create();
}

/**
 * Lets you cancel a running animation paired to a shared value. The
 * cancellation is asynchronous.
 *
 * @param sharedValue - The shared value of a running animation that you want to
 *   cancel.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation
 */
export const cancelAnimation = cancelAnimationWeb;
