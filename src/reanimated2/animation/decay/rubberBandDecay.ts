'use strict';
import type { RubberBandDecayConfig, InnerDecayAnimation } from './utils';
import { SLOPE_FACTOR, VELOCITY_EPS } from './utils';

const DERIVATIVE_EPS = 0.1;

export function rubberBandDecay(
  animation: InnerDecayAnimation,
  now: number,
  config: RubberBandDecayConfig
): boolean {
  'worklet';
  const { lastTimestamp, startTimestamp, current, velocity } = animation;

  const deltaTime = Math.min(now - lastTimestamp, 64);
  const clampIndex =
    Math.abs(current - config.clamp[0]) < Math.abs(current - config.clamp[1])
      ? 0
      : 1;

  let derivative = 0;
  if (current < config.clamp[0] || current > config.clamp[1]) {
    derivative = current - config.clamp[clampIndex];
  }

  const v =
    velocity *
      Math.exp(
        -(1 - config.deceleration) * (now - startTimestamp) * SLOPE_FACTOR
      ) -
    derivative * config.rubberBandFactor;

  if (Math.abs(derivative) > DERIVATIVE_EPS) {
    animation.springActive = true;
  } else if (animation.springActive) {
    animation.current = config.clamp[clampIndex];
    return true;
  } else if (Math.abs(v) < VELOCITY_EPS) {
    return true;
  }

  animation.current = current + (v * config.velocityFactor * deltaTime) / 1000;
  animation.velocity = v;
  animation.lastTimestamp = now;
  return false;
}
