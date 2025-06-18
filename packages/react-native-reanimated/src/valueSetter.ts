'use strict';
import type { AnimationObject, Mutable } from './commonTypes';

export function valueSetter<Value>(
  mutable: Mutable<Value>,
  value: Value,
  forceUpdate = false
): void {
  'worklet';
  const previousAnimation = mutable._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    mutable._animation = null;
  }
  if (
    typeof value === 'function' ||
    (value !== null &&
      typeof value === 'object' &&
      // TODO TYPESCRIPT fix this after fixing AnimationObject type
      (value as unknown as AnimationObject).onFrame !== undefined)
  ) {
    const animation: AnimationObject<Value> =
      typeof value === 'function'
        ? // TODO TYPESCRIPT fix this after fixing AnimationObject type
          (value as () => AnimationObject<Value>)()
        : // TODO TYPESCRIPT fix this after fixing AnimationObject type
          (value as unknown as AnimationObject<Value>);
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    // this happens when the animation's target value(stored in animation.current until animation.onStart is called) is set to the same value as a current one(this._value)
    // built in animations that are not higher order(withTiming, withSpring) hold target value in .current
    if (
      mutable._value === animation.current &&
      !animation.isHigherOrder &&
      !forceUpdate
    ) {
      animation.callback?.(true);
      return;
    }
    // animated set
    const initializeAnimation = (timestamp: number) => {
      animation.onStart(animation, mutable.value, timestamp, previousAnimation);
    };
    const currentTimestamp =
      global.__frameTimestamp || global._getAnimationTimestamp();
    initializeAnimation(currentTimestamp);

    const step = (newTimestamp: number) => {
      // Function `requestAnimationFrame` adds callback to an array, all the callbacks are flushed with function `__flushAnimationFrame`
      // Usually we flush them inside function `nativeRequestAnimationFrame` and then the given timestamp is the timestamp of end of the current frame.
      // However function `__flushAnimationFrame` may also be called inside `registerEventHandler` - then we get actual timestamp which is earlier than the end of the frame.

      const timestamp =
        newTimestamp < (animation.timestamp || 0)
          ? animation.timestamp
          : newTimestamp;

      if (animation.cancelled) {
        animation.callback?.(false /* finished */);
        return;
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.finished = true;
      animation.timestamp = timestamp;
      // TODO TYPESCRIPT
      // For now I'll assume that `animation.current` is always defined
      // but actually need to dive into animations to understand it
      mutable._value = animation.current!;
      if (finished) {
        animation.callback?.(true /* finished */);
      } else {
        requestAnimationFrame(step);
      }
    };

    mutable._animation = animation;

    step(currentTimestamp);
  } else {
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    if (mutable._value === value && !forceUpdate) {
      return;
    }
    mutable._value = value;
  }
}
