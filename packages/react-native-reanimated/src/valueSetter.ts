'use strict';
import type {
  AnimatableValue,
  AnimationObject,
  Mutable,
  ReanimatedValue,
} from './commonTypes';

export function valueSetter<TValue>(
  mutable: Mutable<TValue>,
  value: ReanimatedValue<TValue>,
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
      (value as AnimationObject).onFrame !== undefined)
  ) {
    const animation: AnimationObject =
      typeof value === 'function'
        ? (value as () => AnimationObject)()
        : (value as AnimationObject);
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
      // Animations only run for `AnimatableValue`-typed shared values; the
      // mutable's `TValue` generic isn't constrained here, so cast through to
      // the animation framework's expected type.
      animation.onStart(
        animation,
        mutable.value as AnimatableValue,
        timestamp,
        previousAnimation ?? null
      );
    };
    const currentTimestamp =
      global.__frameTimestamp || global._getAnimationTimestamp();
    initializeAnimation(currentTimestamp);

    const step = (timestamp: number) => {
      if (animation.cancelled) {
        animation.callback?.(false /* finished */);
        return;
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.finished = true;
      animation.timestamp = timestamp;
      mutable._value = animation.current as TValue;
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
    mutable._value = value as TValue;
  }
}
