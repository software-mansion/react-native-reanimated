import { AnimationObject } from './commonTypes';
import { getTimestamp } from './time';
import { scrollTo } from './NativeMethods';
export { stopMapper } from './mappers';

export function scrollValueSetter(sv: any, value: any, animatedRef: any): void {
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
    const currentTimestamp = getTimestamp();
    initializeAnimation(currentTimestamp);
    const step = (timestamp: number) => {
      if (animation.cancelled) {
        animation.callback && animation.callback(false /* finished */);
        return;
      }
      const finished = animation.onFrame(animation, timestamp);
      animation.finished = true;
      animation.timestamp = timestamp;
      scrollTo(animatedRef, 0, Number(animation.current), false);
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
    scrollTo(animatedRef, 0, Number(value), false);
  }
}
