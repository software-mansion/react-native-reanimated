import { defineAnimation } from './util';
import { Animation, AnimationObject, NextAnimation, Timestamp } from './commonTypes';

export interface DelayAnimation extends Animation<DelayAnimation> {
  startTime: Timestamp;
  started: boolean; 
  previousAnimation?: Animation<AnimationObject>
}

export function withDelay(
  delayMs: number,
  _nextAnimation: NextAnimation
): Animation<DelayAnimation> {
  'worklet';
  return defineAnimation(_nextAnimation, () => {
    'worklet';
    const nextAnimation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function delay(animation: DelayAnimation, now: Timestamp): boolean {
      const { startTime, started, previousAnimation } = animation;

      if (now - startTime > delayMs) {
        if (!started) {
          nextAnimation.onStart(
            nextAnimation,
            animation.current,
            now,
            previousAnimation
          );
          animation.previousAnimation = null;
          animation.started = true;
        }
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current;
        return finished;
      } else if (previousAnimation) {
        const finished = previousAnimation.onFrame(previousAnimation, now);
        animation.current = previousAnimation.current;
        if (finished) {
          animation.previousAnimation = null;
        }
      }
      return false;
    }

    function onStart(
      animation: DelayAnimation,
      value: number,
      now: Timestamp,
      previousAnimation: Animation<any> // TODO
    ): void {
      animation.startTime = now;
      animation.started = false;
      animation.current = value;
      animation.previousAnimation = previousAnimation;
    }

    const callback = (finished: boolean): void => {
      if (nextAnimation.callback) {
        nextAnimation.callback(finished);
      }
    };

    return {
      isHigherOrder: true,
      onFrame: delay,
      onStart,
      current: nextAnimation.current,
      callback,
    };
  });
}

/* Deprecated section, kept for backward compatibility. Will be removed soon */
export function delay(
  delayMs: number,
  _nextAnimation: Animation<AnimationObject> | (() => Animation<AnimationObject>)
): Animation<DelayAnimation> {
  'worklet';
  console.warn('Method `delay` is deprecated. Please use `withDelay` instead');
  return withDelay(delayMs, _nextAnimation);
}
