'use strict';
import {
  isWorkletFunction,
  RuntimeKind,
  scheduleOnUI,
} from 'react-native-worklets';

import { IS_JEST } from '../common';
import type {
  AnimationObject,
  EasingFunction,
  SharedValue,
} from '../commonTypes';
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
  easing: EasingFunction | EasingFunctionFactory
): void {
  'worklet';
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    // If this is called on UI (for example from gesture handler with worklets), we don't get easing,
    // but its bound copy, which is not a worklet. We don't want to throw any error then.
    return;
  }
  if (IS_JEST) {
    // It is possible to run reanimated on web without plugin, so let's skip this check on web
    return;
  }
  // @ts-ignore typescript wants us to use `in` instead, which doesn't work with host objects
  if (easing?.factory) {
    return;
  }

  if (!isWorkletFunction(easing)) {
    throw new Error(
      '[Reanimated] The easing function is not a worklet. Please make sure you import `Easing` from react-native-reanimated.'
    );
  }
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

  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative || IS_JEST) {
    return create();
  }
  create.__isAnimationDefinition = true;

  // @ts-expect-error it's fine
  return create;
}

function cancelAnimationNative<TValue>(sharedValue: SharedValue<TValue>): void {
  'worklet';
  // setting the current value cancels the animation if one is currently running
  if (globalThis.__RUNTIME_KIND !== RuntimeKind.ReactNative) {
    sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
  } else {
    scheduleOnUI(() => {
      'worklet';
      sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
    });
  }
}

/**
 * Lets you cancel a running animation paired to a shared value. The
 * cancellation is asynchronous.
 *
 * @param sharedValue - The shared value of a running animation that you want to
 *   cancel.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation
 */
export const cancelAnimation = IS_JEST
  ? cancelAnimationWeb
  : cancelAnimationNative;
