import { defineAnimation } from './util';
import {
  Animation,
  AnimationCallback,
  AnimatableValue,
  Timestamp,
} from '../commonTypes';

type SpringConfig = {
  stiffness?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
  velocity?: number;
} & (
  | {
      mass?: never;
      damping?: number;
      duration?: number;
    }
  | {
      mass?: number;
      damping?: never;
      duration?: number;
    }
  | {
      mass?: number;
      damping?: number;
      duration?: undefined;
    }
);

export interface SpringAnimation extends Animation<SpringAnimation> {
  current: AnimatableValue;
  toValue: AnimatableValue;
  velocity: number;
  lastTimestamp: Timestamp;
  firstTimestamp: Timestamp;
  newDamping: number;
  newMass: number;
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
    const defaultConfig: Record<keyof SpringConfig, any> = {
      damping: 10,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
      velocity: 0,
      duration: undefined,
    } as const;

    const config = { ...defaultConfig, ...userConfig };

    function spring(animation: InnerSpringAnimation, now: Timestamp): boolean {
      const { toValue, firstTimestamp, lastTimestamp, current, velocity } =
        animation;

      const timeFromStart = now - firstTimestamp;
      if (userConfig?.duration && timeFromStart > userConfig.duration * 1.1) {
        animation.current = toValue;

        // clear lastTimestamp to avoid using stale value by the next spring animation that starts after this one
        animation.lastTimestamp = 0;
        return true;
      }

      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;

      const c =
        config.duration && !userConfig?.damping
          ? animation.newDamping
          : config.damping;
      const m =
        config.duration && userConfig?.damping
          ? animation.newMass
          : config.mass;
      const k = config.stiffness;

      const v0 = -velocity;
      const x0 = toValue - current;

      const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
      const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
      const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

      const t = deltaTime / 1000;

      const sin1 = Math.sin(omega1 * t);
      const cos1 = Math.cos(omega1 * t);

      // under damped
      const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
      const underDampedFrag1 =
        underDampedEnvelope *
        (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);

      const underDampedPosition = toValue - underDampedFrag1;
      // This looks crazy -- it's actually just the derivative of the oscillation function
      const underDampedVelocity =
        zeta * omega0 * underDampedFrag1 -
        underDampedEnvelope *
          (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

      // critically damped
      const criticallyDampedEnvelope = Math.exp(-omega0 * t);
      const criticallyDampedPosition =
        toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

      const criticallyDampedVelocity =
        criticallyDampedEnvelope *
        (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);

      const isOvershooting = () => {
        if (config.overshootClamping && config.stiffness !== 0) {
          return current < toValue
            ? animation.current > toValue
            : animation.current < toValue;
        } else {
          return false;
        }
      };

      const isVelocity = Math.abs(velocity) < config.restSpeedThreshold;
      const isDisplacement =
        config.stiffness === 0 ||
        Math.abs(toValue - current) < config.restDisplacementThreshold;

      if (zeta < 1) {
        animation.current = underDampedPosition;
        animation.velocity = underDampedVelocity;
      } else {
        animation.current = criticallyDampedPosition;
        animation.velocity = criticallyDampedVelocity;
      }

      if (isOvershooting() || (isVelocity && isDisplacement)) {
        if (config.stiffness !== 0) {
          animation.velocity = 0;
          animation.current = toValue;
        }
        // clear lastTimestamp to avoid using stale value by the next spring animation that starts after this one
        animation.lastTimestamp = 0;
        return true;
      }
      return false;
    }

    function onStart(
      animation: SpringAnimation,
      value: number,
      now: Timestamp,
      previousAnimation: SpringAnimation
    ): void {
      animation.current = value;

      let newDamping = config.duration;
      let newMass = config.mass;

      if (userConfig?.duration && userConfig?.damping && userConfig?.mass) {
        console.warn(
          "You've specified to all the parameters: damping, mass and duration. At least one of them must be calculated depending on the two others"
        );
      }

      if (userConfig?.duration) {
        const amplitude = Number(animation.toValue) - value;

        if (!userConfig?.damping) {
          // If damping is not provided calculate new damping

          /** Use this formulae https://phys.libretexts.org/Bookshelves/University_Physics/Book%3A_University_Physics_(OpenStax)/Book%3A_University_Physics_I_-_Mechanics_Sound_Oscillations_and_Waves_(OpenStax)/15%3A_Oscillations/15.06%3A_Damped_Oscillations
           * to find the asympotote and esitmate the damping that gives us the expected duration */
          const m = config.mass;
          newDamping =
            -((2 * m) / (0.001 * config.duration)) *
            Math.log(config.restDisplacementThreshold / Math.abs(amplitude));
        } else {
          // calculate new mass
          const d = config.damping;
          newMass =
            -(0.002 * d * config.duration) /
            Math.log(config.restDisplacementThreshold / Math.abs(amplitude));
        }
      }

      if (previousAnimation) {
        animation.velocity =
          previousAnimation.velocity || animation.velocity || 0;
        animation.lastTimestamp = previousAnimation.lastTimestamp || now;
        animation.firstTimestamp = previousAnimation.firstTimestamp || now;
        animation.newDamping = previousAnimation.newDamping || newDamping;
        animation.newMass = previousAnimation.newMass || newMass;
      } else {
        animation.lastTimestamp = now;
        animation.firstTimestamp = now;
        animation.newDamping = newDamping;
        animation.newMass = newMass;
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
      firstTimestamp: 0,
      newDamping: 0,
      newMass: 0,
    } as SpringAnimation;
  });
}
