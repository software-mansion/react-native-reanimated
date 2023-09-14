'use strict';
import { defineAnimation, getReduceMotionForAnimation } from '../util';
import type {
  AnimationCallback,
  Timestamp,
  RequiredKeys,
  Animation,
} from '../../commonTypes';
import { rubberBandEffectDecay } from './rubberBandDecay';
import type {
  DecayAnimation,
  DecayConfig,
  DefaultDecayConfig,
  InnerDecayAnimation,
} from './utils';
import { validateConfig } from './utils';
import { rigidDecay } from './rigidDecay';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type withDecayType = (
  userConfig: DecayConfig,
  callback?: AnimationCallback
) => number;

function isDefaultDecayConfigWithClamp(
  config: DefaultDecayConfig
): config is RequiredKeys<DefaultDecayConfig, 'clamp'> {
  'worklet';
  return Array.isArray(config.clamp) && config.clamp.length === 2;
}

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

    const decay: (animation: InnerDecayAnimation, now: number) => boolean =
      config.rubberBandEffect && isDefaultDecayConfigWithClamp(config)
        ? (animation, now) => rubberBandEffectDecay(animation, now, config)
        : (animation, now) => rigidDecay(animation, now, config);

    function onStart(
      animation: DecayAnimation,
      value: number,
      now: Timestamp
    ): void {
      animation.current = value;
      animation.lastTimestamp = now;
      animation.startTimestamp = now;
      animation.initialVelocity = config.velocity;
      validateConfig(config);

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
