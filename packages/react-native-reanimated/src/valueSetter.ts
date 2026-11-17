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
    mutable._animation = null;
    if (!previousAnimation.finished) {
      previousAnimation.cancelled = true;
      previousAnimation.callback?.(false);
    }
  }
  if (
    typeof value === 'function' ||
    (value !== null &&
      typeof value === 'object' &&
      // TODO TYPESCRIPT fix this after fixing AnimationObject type
      (value as unknown as AnimationObject).onFrame !== undefined &&
      (value as unknown as AnimationObject).onStart !== undefined)
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
    const step = (timestamp: number) => {
      if (animation.cancelled) {
        return;
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.timestamp = timestamp;
      mutable._value = animation.current!;
      if (finished) {
        animation.finished = true;
        animation.callback?.(true /* finished */);
      } else {
        requestAnimationFrame(step);
      }
    };

    mutable._animation = animation;

    if (global.__frameTimestamp !== undefined) {
      const currentTimestamp = global.__frameTimestamp;
      initializeAnimation(currentTimestamp);
      step(currentTimestamp);
    } else {
      // Start on the next vsync so the animation clock matches the frame
      // callback timestamp (avoids a negative first-step elapsed time on web).
      // See https://github.com/software-mansion/react-native-reanimated/issues/10752
      requestAnimationFrame((timestamp) => {
        if (animation.cancelled) {
          return;
        }
        initializeAnimation(timestamp);
        step(timestamp);
      });
    }
  } else {
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    if (mutable._value === value && !forceUpdate) {
      return;
    }
    mutable._value = value;
  }
}
