import { defineAnimation } from './util';
import {
  Animation,
  AnimationCallback,
  AnimationObject,
  AnimatableValue,
  Timestamp,
} from '../commonTypes';

interface DecayConfig {
  velocity?: number;
  deceleration?: number;
  velocityFactor?: number;
  clamp?: number[];
  rubberBandEffect?: boolean;
  rubberBandFactor?: number;
}

export interface DecayAnimation extends Animation<DecayAnimation> {
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  initialVelocity: number;
  velocity: number;
  current: AnimatableValue;
}

export interface InnerDecayAnimation
  extends Omit<DecayAnimation, 'current'>,
    AnimationObject {
  current: number;
}

export function withDecay(
  userConfig: DecayConfig,
  callback?: AnimationCallback
): Animation<DecayAnimation> {
  'worklet';

  return defineAnimation<DecayAnimation>(0, () => {
    'worklet';
    const defaultConfig: Required<DecayConfig> = {
      velocity: 0,
      deceleration: 0.998,
      clamp: [],
      velocityFactor: 1,
      rubberBandFactor: 0.6,
      rubberBandEffect: false,
    };

    const config = { ...defaultConfig, ...userConfig };

    const VELOCITY_EPS = 1;
    const SLOPE_FACTOR = 0.1;

    let decay: (animation: InnerDecayAnimation, now: number) => boolean;

    if (config.rubberBandEffect) {
      decay = (animation: InnerDecayAnimation, now: number): boolean => {
        const {
          lastTimestamp,
          startTimestamp,
          current,
          initialVelocity,
          velocity,
        } = animation;

        const deltaTime = Math.min(now - lastTimestamp, 64);
        const clampIndex = initialVelocity > 0 ? 1 : 0;
        let derivative = 0;
        if (current < config.clamp[0] || current > config.clamp[1]) {
          derivative = current - config.clamp[clampIndex];
        }

        if (derivative !== 0) {
          animation.springActive = true;
        } else if (derivative === 0 && animation.springActive) {
          animation.current = config.clamp[clampIndex];
          return true;
        }

        const v =
          velocity *
            Math.exp(
              -(1 - config.deceleration) * (now - startTimestamp) * SLOPE_FACTOR
            ) -
          derivative * config.rubberBandFactor;

        animation.current =
          current + (v * config.velocityFactor * deltaTime) / 1000;
        animation.velocity = v;
        animation.lastTimestamp = now;
        return false;
      };
    } else {
      decay = (animation: InnerDecayAnimation, now: number): boolean => {
        const {
          lastTimestamp,
          startTimestamp,
          initialVelocity,
          current,
          velocity,
        } = animation;

        const deltaTime = Math.min(now - lastTimestamp, 64);
        const v =
          velocity *
          Math.exp(
            -(1 - config.deceleration) * (now - startTimestamp) * SLOPE_FACTOR
          );
        animation.current =
          current + (v * config.velocityFactor * deltaTime) / 1000;
        animation.velocity = v;
        animation.lastTimestamp = now;

        if (config.clamp) {
          if (initialVelocity < 0 && animation.current <= config.clamp[0]) {
            animation.current = config.clamp[0];
            return true;
          } else if (
            initialVelocity > 0 &&
            animation.current >= config.clamp[1]
          ) {
            animation.current = config.clamp[1];
            return true;
          }
        }

        return Math.abs(v) < VELOCITY_EPS;
      };
    }

    function validateConfig(): void {
      if (config.clamp) {
        if (!Array.isArray(config.clamp)) {
          throw Error(
            `config.clamp must be an array but is ${typeof config.clamp}`
          );
        }
        if (config.clamp.length !== 2) {
          throw Error(
            `clamp array must contain 2 items but is given ${config.clamp.length}`
          );
        }
      }
      if (config.velocityFactor <= 0) {
        throw Error(
          `config.velocityFactor must be greather then 0 but is ${config.velocityFactor}`
        );
      }
      if (config.rubberBandEffect && !config.clamp) {
        throw Error(
          'You need to set `clamp` property when using `rubberBandEffect`.'
        );
      }
    }

    function onStart(
      animation: DecayAnimation,
      value: number,
      now: Timestamp
    ): void {
      animation.current = value;
      animation.lastTimestamp = now;
      animation.startTimestamp = now;
      animation.initialVelocity = config.velocity;
      validateConfig();
    }

    return {
      onFrame: decay,
      onStart,
      callback,
      velocity: config.velocity ?? 0,
      initialVelocity: 0,
      current: 0,
      lastTimestamp: 0,
      startTimestamp: 0,
    } as DecayAnimation;
  });
}
