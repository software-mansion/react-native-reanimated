'use strict';
import { RuntimeKind } from 'react-native-worklets';

import type {
  AnimationObject,
  EasingFunction,
  SharedValue,
} from '../commonTypes';
import type { EasingFunctionFactory } from '../Easing';
import type { StyleLayoutAnimation } from './commonTypes';
import type { AnimationToDecoration } from './utilCommon';
import { decorateAnimation, IN_STYLE_UPDATER } from './utilCommon';

export {
  getReduceMotionForAnimation,
  getReduceMotionFromConfig,
  initialUpdaterRun,
  isValidLayoutAnimationProp,
  recognizePrefixSuffix,
} from './utilCommon';

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
export function cancelAnimation<TValue>(
  sharedValue: SharedValue<TValue>
): void {
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}
