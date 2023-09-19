'use strict';
import type { DefaultDecayConfig, InnerDecayAnimation } from './utils';
import { SLOPE_FACTOR, VELOCITY_EPS } from './utils';

export const rigidDecay = (
  animation: InnerDecayAnimation,
  now: number,
  config: DefaultDecayConfig
): boolean => {
  const { lastTimestamp, startTimestamp, initialVelocity, current, velocity } =
    animation;

  const deltaTime = Math.min(now - lastTimestamp, 64);
  const v =
    velocity *
    Math.exp(
      -(1 - config.deceleration) * (now - startTimestamp) * SLOPE_FACTOR
    );
  animation.current = current + (v * config.velocityFactor * deltaTime) / 1000;
  animation.velocity = v;
  animation.lastTimestamp = now;

  if (config.clamp) {
    if (initialVelocity < 0 && animation.current <= config.clamp[0]) {
      animation.current = config.clamp[0];
      return true;
    } else if (initialVelocity > 0 && animation.current >= config.clamp[1]) {
      animation.current = config.clamp[1];
      return true;
    }
  }

  return Math.abs(v) < VELOCITY_EPS;
};
