/* global _createKeyframeAnimation */
import { defineAnimation } from './util';
import { Animation, AnimationCallback, Timestamp } from '../commonTypes';

interface KeyframeConfig {
  duration?: number;
}

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
  userConfig?: KeyframeConfig,
  callback?: AnimationCallback
): Animation<KeyframeAnimation> {
  'worklet';

  const toValue = 100;

  return defineAnimation<KeyframeAnimation>(toValue, () => {
    'worklet';

    // TODO: figure out why we can't use spread or Object.assign here
    // when user config is "frozen object" we can't enumerate it (perhaps
    // something is wrong with the object prototype).
    const config: Required<KeyframeConfig> = {
      duration: 1,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(
        (key) =>
          ((config as any)[key] = userConfig[key as keyof typeof userConfig])
      );
    }

    function onFrame(
      animation: InnerKeyframeAnimation,
      _now: Timestamp
    ): boolean {
      const [current, running] = animation.getCoreAnimationState();

      if (!running) {
        return true;
      }

      animation.current = current;

      return false;
    }

    function onStart(animation: KeyframeAnimation, value: number): void {
      animation.getCoreAnimationState = _createKeyframeAnimation(
        animation.keys,
        animation.values,
        config.duration
      );
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
