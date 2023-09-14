'use strict';
import { defineAnimation, getReduceMotionForAnimation } from '../util';
import type {
  Animation,
  AnimationCallback,
  Timestamp,
  ReduceMotion,
} from '../../commonTypes';
import type {
  DecayAnimation,
  DefaultDecayConfig,
  InnerDecayAnimation,
} from './utils';
import { rubberBandDecay } from './rubberBandDecay';
import { rigidDecay } from './rigidDecay';

interface DecayConfig {
  deceleration?: number;
  velocityFactor?: number;
  rubberBandEffect?: boolean;
  clamp?: number[];
  velocity?: number;
  reduceMotion?: ReduceMotion;
}

export type WithDecayConfig = DecayConfig;

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type withDecayType = (
  userConfig: DecayConfig,
  callback?: AnimationCallback
) => number;

export const withDecay = function (
  userConfig: DecayConfig,
  callback?: AnimationCallback
): Animation<DecayAnimation> {
  'worklet';

  return defineAnimation<DecayAnimation>(0, () => {
    'worklet';
    const config: DefaultDecayConfig = {
      deceleration: 0.998,
      velocityFactor: 1,
      velocity: 0,
      rubberBandFactor: 0.6,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(
        (key) =>
          ((config as any)[key] = userConfig[key as keyof typeof userConfig])
      );
    }

    let decay: (animation: InnerDecayAnimation, now: number) => boolean;

    if (config.rubberBandEffect) {
      decay = (animation, now) => rubberBandDecay(animation, now, config);
    } else {
      decay = (animation, now) => rigidDecay(animation, now, config);
    }

    function validateConfig(): void {
      if (config.clamp) {
        if (!Array.isArray(config.clamp)) {
          throw new Error(
            `[Reanimated] \`config.clamp\` must be an array but is ${typeof config.clamp}.`
          );
        }
        if (config.clamp.length !== 2) {
          throw new Error(
            `[Reanimated] \`clamp array\` must contain 2 items but is given ${config.clamp.length}.`
          );
        }
      }
      if (config.velocityFactor <= 0) {
        throw new Error(
          `[Reanimated] \`config.velocityFactor\` must be greather then 0 but is ${config.velocityFactor}.`
        );
      }
      if (config.rubberBandEffect && !config.clamp) {
        throw new Error(
          '[Reanimated] You need to set `clamp` property when using `rubberBandEffect`.'
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

      if (animation.reduceMotion && config.clamp) {
        if (value < config.clamp[0]) {
          animation.current = config.clamp[0];
        } else if (value > config.clamp[1]) {
          animation.current = config.clamp[1];
        }
      }
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
      reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
    } as DecayAnimation;
  });
} as unknown as withDecayType;
