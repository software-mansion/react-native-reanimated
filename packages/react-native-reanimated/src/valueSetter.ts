'use strict';
import type { AnimationObject, Mutable } from './commonTypes';

export function valueSetter<Value = unknown>(
  mutable: Mutable<Value>,
  valueOrFactory: Value,
  forceUpdate = false
): void {
  'worklet';
  const previousAnimation = mutable._animation;

  if (previousAnimation) {
    previousAnimation.cancelled = true;
    mutable._animation = null;
  }

  // Call the factory function and store the result in value to check
  // if the value returned by the factory function is an AnimationObject
  const value: Value =
    typeof valueOrFactory === 'function' ? valueOrFactory() : valueOrFactory;
  const valueObject =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  // Check if the value returned by the factory function is not an AnimationObject
  if (valueObject.onFrame === undefined || valueObject.onStart === undefined) {
    // update the value of the mutable only if it's different from the current
    // value or if forceUpdate is true to prevent triggering mappers that treat
    // this value as an input
    if (mutable._value !== value || forceUpdate) {
      mutable._value = value;
    }
    return;
  }

  const animation = value as AnimationObject<Value>;

  // prevent setting again to the same value and triggering the mappers that
  // treat this value as an input this happens when the animation's target value
  // (stored in animation.current until animation.onStart is called) is set to
  // the same value as a current one(this._value) built in animations that are
  // not higher order(withTiming, withSpring) hold target value in .current
  if (
    mutable._value === animation.current &&
    !animation.isHigherOrder &&
    !forceUpdate
  ) {
    animation.callback?.(true);
    return;
  }

  const currentTimestamp =
    global.__frameTimestamp || global._getAnimationTimestamp();
  animation.onStart(
    animation,
    mutable.value,
    currentTimestamp,
    previousAnimation
  );

  const step = (newTimestamp: number) => {
    // `requestAnimationFrame` function adds callback to an array, all callbacks
    // are flushed with function `__flushAnimationFrame`.
    // Usually we flush them inside the `nativeRequestAnimationFrame` function
    // and then the given timestamp is the timestamp of end of the current frame.
    // However, function `__flushAnimationFrame` may also be called inside `registerEventHandler`
    // - then we get actual timestamp which is earlier than the end of the frame.
    const timestamp = Math.max(newTimestamp, animation.timestamp ?? 0);

    if (animation.cancelled) {
      animation.callback?.(false /* finished */);
      return;
    }

    const finished = animation.onFrame(animation, timestamp);
    animation.finished = true;
    animation.timestamp = timestamp;

    mutable._value = animation.current!;
    if (finished) {
      animation.callback?.(true /* finished */);
    } else {
      requestAnimationFrame(step);
    }
  };

  mutable._animation = animation;

  step(currentTimestamp);
}
