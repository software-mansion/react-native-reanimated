import { defineAnimation, getReduceMotionForAnimation } from './util';
import type {
  Animation,
  AnimationCallback,
  AnimationObject,
  AnimatableValue,
  Timestamp,
  ReduceMotion,
} from '../commonTypes';
import { isWeb } from '../PlatformChecker';

interface DecayConfig {
  deceleration?: number;
  velocityFactor?: number;
  rubberBandEffect?: boolean;
  clamp?: number[];
  velocity?: number;
  reduceMotion?: ReduceMotion;
}

export type WithDecayConfig = DecayConfig;

interface DefaultDecayConfig {
  deceleration: number;
  velocityFactor: number;
  clamp?: number[];
  velocity: number;
  reduceMotion?: ReduceMotion;
  rubberBandEffect?: boolean;
  rubberBandFactor: number;
}

export interface DecayAnimation extends Animation<DecayAnimation> {
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  initialVelocity: number;
  velocity: number;
  current: AnimatableValue;
}

interface InnerDecayAnimation
  extends Omit<DecayAnimation, 'current'>,
    AnimationObject {
  current: number;
}

const IS_WEB = isWeb();

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

    const VELOCITY_EPS = IS_WEB ? 1 / 20 : 1;
    const DERIVATIVE_EPS = 0.1;
    const SLOPE_FACTOR = 0.1;

    let decay: (animation: InnerDecayAnimation, now: number) => boolean;

    if (config.rubberBandEffect) {
      decay = (animation: InnerDecayAnimation, now: number): boolean => {
        const { lastTimestamp, startTimestamp, current, velocity } = animation;

        const deltaTime = Math.min(now - lastTimestamp, 64);
        const clampIndex =
          Math.abs(current - config.clamp![0]) <
          Math.abs(current - config.clamp![1])
            ? 0
            : 1;

        let derivative = 0;
        if (current < config.clamp![0] || current > config.clamp![1]) {
          derivative = current - config.clamp![clampIndex];
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
          animation.current = config.clamp![clampIndex];
          return true;
        } else if (Math.abs(v) < VELOCITY_EPS) {
          return true;
        }

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
