/* global _createSpringAnimation */
import { defineAnimation } from './util';
import {
  Animation,
  AnimationCallback,
  AnimatableValue,
  Timestamp,
} from '../commonTypes';

interface SpringConfig {
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
  velocity?: number;
  damping?: number;
}

export interface SpringAnimation extends Animation<SpringAnimation> {
  current: AnimatableValue;
  toValue: AnimatableValue;
  velocity: number;
  lastTimestamp: Timestamp;
}

export interface InnerSpringAnimation
  extends Omit<SpringAnimation, 'toValue' | 'current'> {
  toValue: number;
  current: number;
}

export function withSpring(
  toValue: AnimatableValue,
  userConfig?: SpringConfig,
  callback?: AnimationCallback
): Animation<SpringAnimation> {
  'worklet';

  return defineAnimation<SpringAnimation>(toValue, () => {
    'worklet';

    // TODO: figure out why we can't use spread or Object.assign here
    // when user config is "frozen object" we can't enumerate it (perhaps
    // something is wrong with the object prototype).
    const config: Required<SpringConfig> = {
      damping: 10,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
      velocity: 0,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(
        (key) =>
          ((config as any)[key] = userConfig[key as keyof typeof userConfig])
      );
    }

    function spring(animation: InnerSpringAnimation, _now: Timestamp): boolean {
      const [current, running] = animation.getCoreAnimationState();

      if (!running) {
        return true;
      }

      animation.velocity =
        (current - animation.current) / (_now - animation.lastTimestamp);
      animation.current = current;
      animation.lastTimestamp = _now;

      return false;
    }

    function onStart(
      animation: SpringAnimation,
      value: number,
      now: Timestamp,
      previousAnimation: SpringAnimation
    ): void {
      const initialVelocity =
        previousAnimation?.velocity || animation.velocity || 0;
      animation.getCoreAnimationState = _createSpringAnimation(
        value,
        toValue as number, // TODO: support other types
        initialVelocity
      );
      animation.current = value;
      if (previousAnimation) {
        animation.velocity =
          previousAnimation.velocity || animation.velocity || 0;
        animation.lastTimestamp = previousAnimation.lastTimestamp || now;
      } else {
        animation.lastTimestamp = now;
      }
    }

    return {
      onFrame: spring,
      onStart,
      toValue,
      velocity: config.velocity || 0,
      current: toValue,
      callback,
      lastTimestamp: 0,
    } as SpringAnimation;
  });
}
