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
} & /** When duration is provided damping is set to some calculated value unless damping value is specified in config. If damping is specified mass is calculated. If both mass and damping are provided typescript error is thrown.
Also initial velocity must be zero if duration is specified. */ (
  | { mass?: never; damping?: number; duration?: number }
  | { mass?: number; damping?: never; duration?: number }
  | { mass?: number; damping?: number; duration?: never }
);

export interface SpringAnimation extends Animation<SpringAnimation> {
  current: AnimatableValue;
  toValue: AnimatableValue;
  velocity: number;
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  startValue: number;
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
    if (userConfig?.duration) {
      config.velocity = 0;
    }

    function initialCalculations(
      animation: InnerSpringAnimation,
      now: Timestamp
    ): {
      t: number;
      v0: number;
      x0: number;
      zeta: number;
      omega0: number;
      omega1: number;
    } {
      const { toValue, lastTimestamp, current, velocity } = animation;

      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;

      const c = config.damping;
      const m = config.mass;
      const k = config.stiffness;

      const v0 = -velocity;
      const x0 = toValue - current;

      const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
      const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
      const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

      const t = deltaTime / 1000;

      return { t, v0, x0, zeta, omega0, omega1 };
    }

    function criticallyDampedSpringCalculations(
      animation: InnerSpringAnimation,
      precalculatedValues: {
        v0: number;
        x0: number;
        omega0: number;
        t: number;
      }
    ): { position: number; velocity: number } {
      const { toValue } = animation;

      const { v0, x0, omega0, t } = precalculatedValues;

      const criticallyDampedEnvelope = Math.exp(-omega0 * t);
      const criticallyDampedPosition =
        toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

      const criticallyDampedVelocity =
        criticallyDampedEnvelope *
        (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);

      return {
        position: criticallyDampedPosition,
        velocity: criticallyDampedVelocity,
      };
    }

    function underDampedSpringCalculations(
      animation: InnerSpringAnimation,
      precalculatedValues: {
        zeta: number;
        v0: number;
        x0: number;
        omega0: number;
        omega1: number;
        t: number;
      }
    ): { position: number; velocity: number } {
      const { toValue, current, velocity } = animation;

      const { zeta, t, omega0, omega1 } = precalculatedValues;

      const v0 = -velocity;
      const x0 = toValue - current;

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

      return { position: underDampedPosition, velocity: underDampedVelocity };
    }

    function isAnimationTerminatingCalculation(
      animation: InnerSpringAnimation,
      config: Partial<SpringConfig> &
        Required<
          Pick<SpringConfig, 'restSpeedThreshold' | 'restDisplacementThreshold'>
        >,
      current: number
    ): {
      isOvershooting: boolean;
      isVelocity: boolean;
      isDisplacement: boolean;
    } {
      const { toValue, velocity } = animation;

      const isOvershooting =
        config.overshootClamping && config.stiffness !== 0
          ? current < toValue
            ? animation.current > toValue
            : animation.current < toValue
          : false;

      const isVelocity = Math.abs(velocity) < config.restSpeedThreshold;
      const isDisplacement =
        config.stiffness === 0 ||
        Math.abs(toValue - current) < config.restDisplacementThreshold;

      return { isOvershooting, isVelocity, isDisplacement };
    }

    function spring(animation: InnerSpringAnimation, now: Timestamp): boolean {
      const { toValue, startTimestamp, current } = animation;

      const timeFromStart = now - startTimestamp;
      if (userConfig?.duration && timeFromStart > userConfig.duration) {
        animation.current = toValue;

        // clear lastTimestamp to avoid using stale value by the next spring animation that starts after this one
        animation.lastTimestamp = 0;

        return true;
      }

      const { t, v0, x0, zeta, omega0, omega1 } = initialCalculations(
        animation,
        now
      );
      animation.lastTimestamp = now;

      const { position: newPosition, velocity: newVelocity } =
        // always use underDamped motion if duration was provided
        zeta < 1 || userConfig?.duration
          ? underDampedSpringCalculations(animation, {
              zeta,
              v0,
              x0,
              omega0,
              omega1,
              t,
            })
          : criticallyDampedSpringCalculations(animation, {
              v0,
              x0,
              omega0,
              t,
            });

      const { isOvershooting, isVelocity, isDisplacement } =
        isAnimationTerminatingCalculation(animation, config, current);

      animation.current = newPosition;
      animation.velocity = newVelocity;

      if (isOvershooting || (isVelocity && isDisplacement)) {
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
      animation.startValue = value;

      let newDamping = config.duration;
      let newMass = config.mass;

      if (userConfig?.duration && userConfig?.damping && userConfig?.mass) {
        console.warn(
          "You've specified all the parameters: damping, mass and duration. At least one of them must be calculated depending on the two others"
        );
      }

      if (userConfig?.duration) {
        let x0 = Number(animation.toValue) - value;
        if (Number(previousAnimation?.startValue)) {
          // It makes our animation a bit smoother, especially if sb triggered same animation twice
          x0 = Number(animation.toValue) - Number(previousAnimation.startValue);
        }
        const v0 = config.velocity;
        const k = config.stiffness;
        const m = config.mass;

        if (!userConfig?.damping) {
          // If damping is not provided calculate new damping

          /** Use this formula: https://phys.libretexts.org/Bookshelves/University_Physics/Book%3A_University_Physics_(OpenStax)/Book%3A_University_Physics_I_-_Mechanics_Sound_Oscillations_and_Waves_(OpenStax)/15%3A_Oscillations/15.06%3A_Damped_Oscillations
           * to find the asympotote and esitmate the damping that gives us the expected duration */
          const amplitude = Math.sqrt((m * v0 * v0 + k * x0 * x0) / k);

          newDamping =
            -((2 * m) / (0.001 * config.duration)) *
            Math.log(config.restDisplacementThreshold / Math.abs(amplitude));

          config.damping = newDamping;
        } else {
          /** As you can notice our formula for amplitude contains mass
           * Still we can calculate mass solving this equation (https://www.wolframalpha.com/input?i=solve%28ln%28t+*+sqrt%28x0*x0+%2B+v0*v0*m%29%29+%3D+%28m*c%29%2F%282000*d%29%2Cm%29)
           * However the solution contain Lambert W function (https://en.wikipedia.org/wiki/Lambert_W_function)
           * And this function is difficult to implement.
           *
           * However if initial velocity is zero the kinetic energy is zero too and all the calculations get much simpler
           */
          if (config.velocity !== 0) {
            console.warn(
              "You've specified damping, velocity and duration in your spring config. This combination of parameters is not supported, your velocity will be overwritten with value 0."
            );
            config.velocity = 0;
          }
          const amplitude = x0;

          // calculate new mass
          const d = config.damping;
          newMass =
            (-0.002 * (d * config.duration)) /
            Math.log(
              (0.01 * config.restDisplacementThreshold) / Math.abs(amplitude)
            );
          config.mass = newMass;
        }
      }

      if (previousAnimation) {
        // Check if we could have triggered the same animation twice.
        // In such a case we don't want to extend its duration and we will copy previous start timestamp
        const triggeredTwice =
          previousAnimation.type === 'spring' &&
          previousAnimation.toValue === animation.toValue;

        animation.velocity =
          previousAnimation.velocity || animation.velocity || 0;
        animation.lastTimestamp = previousAnimation.lastTimestamp || now;
        animation.startTimestamp = triggeredTwice
          ? previousAnimation.startTimestamp || now
          : now;
      } else {
        animation.lastTimestamp = now;
        animation.startTimestamp = now;
        animation.newDamping = newDamping;
        animation.newMass = newMass;
      }

      animation.startTimestamp = now;
    }

    return {
      type: 'spring',
      onFrame: spring,
      onStart,
      toValue,
      velocity: config.velocity || 0,
      current: toValue,
      startValue: 0,
      callback,
      lastTimestamp: 0,
      startTimestamp: 0,
      newDamping: 0,
      newMass: 0,
    } as SpringAnimation;
  });
}
