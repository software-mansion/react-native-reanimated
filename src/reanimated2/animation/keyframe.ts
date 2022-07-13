import { defineAnimation } from './util';
import { Animation, AnimationCallback, Timestamp } from '../commonTypes';

export interface KeyframeAnimation extends Animation<KeyframeAnimation> {
  current: number;
  keys: number[];
  values: number[];
}

export interface InnerKeyframeAnimation
  extends Omit<KeyframeAnimation, 'keys' | 'values' | 'current'> {
  keys: number[];
  values: number[];
  current: number;
}

export function withKeyframe(
  keys: number[],
  values: number[],
  callback?: AnimationCallback
): Animation<KeyframeAnimation> {
  'worklet';

  const toValue = 100;

  return defineAnimation<KeyframeAnimation>(toValue, () => {
    'worklet';

    function onFrame(
      animation: InnerKeyframeAnimation,
      _now: Timestamp
    ): boolean {
      console.log('onFrame');
      animation.current = 42;
      return false;
    }

    function onStart(animation: KeyframeAnimation, value: number): void {
      console.log('onStart');
      animation.current = value;
    }

    return {
      onFrame,
      onStart,
      keys,
      values,
      current: toValue,
      callback,
    } as KeyframeAnimation;
  });
}
