import type { AnimationObject, AnimatableValue } from './commonTypes';
import type { Descriptor } from './hook/commonTypes';

export function valueSetter(sv: any, value: any): void {
  'worklet';
  const previousAnimation = sv._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    sv._animation = null;
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
    if (sv._value === animation.current && !animation.isHigherOrder) {
      animation.callback && animation.callback(true);
      return;
    }
    // animated set
    const initializeAnimation = (timestamp: number) => {
      animation.onStart(animation, sv.value, timestamp, previousAnimation);
    };
    const currentTimestamp = global.__frameTimestamp || performance.now();
    initializeAnimation(currentTimestamp);

    const step = (newTimestamp: number) => {
      // We have found that react-native-gesture-handle causes some bugs https://github.com/software-mansion/react-native-reanimated/issues/4852
      // In such a case we may have slight timestamp oscillation
      // Therefore an extra check is added - if new timestamp is smaller, keep the previous one.
      const timestamp =
        newTimestamp < (animation.timestamp || 0)
          ? animation.timestamp
          : newTimestamp;

      if (animation.cancelled) {
        animation.callback && animation.callback(false /* finished */);
        return;
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.finished = true;
      animation.timestamp = timestamp;
      sv._value = animation.current;
      if (finished) {
        animation.callback && animation.callback(true /* finished */);
      } else {
        requestAnimationFrame(step);
      }
    };

    sv._animation = animation;

    step(currentTimestamp);
  } else {
    // prevent setting again to the same value
    // and triggering the mappers that treat this value as an input
    if (sv._value === value) {
      return;
    }
    sv._value = value as Descriptor | AnimatableValue;
  }
}
