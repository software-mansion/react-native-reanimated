import { defineAnimation } from './util';
import {
  Animation,
  AnimationCallback,
  AnimatableValue,
  Timestamp,
} from '../commonTypes';
import { bisectRoot } from './springUtils';

type SpringConfig = {
  stiffness?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
  velocity?: number;
} & (
  | {
      mass?: number;
      damping?: number;
      duration?: never;
      dampingRatio?: never;
    }
  | {
      mass?: never;
      damping?: never;
      duration?: number;
      dampingRatio?: number;
    }
);

export interface SpringAnimation extends Animation<SpringAnimation> {
  current: AnimatableValue;
  toValue: AnimatableValue;
  velocity: number;
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  startValue: number;
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
      duration: 2000,
      dampingRatio: 0.5,
    } as const;

    const config = { ...defaultConfig, ...userConfig };

    // TODO this could be done only once
    function initialCalculations(newMass = 0): {
      zeta: number;
      omega0: number;
      omega1: number;
    } {
      const useConfigWithDuration =
        userConfig?.duration || userConfig?.dampingRatio;

      if (useConfigWithDuration) {
        const { stiffness: k, dampingRatio: zeta } = config;

        const omega0 = Math.sqrt(k / newMass);
        const omega1 = omega0 * Math.sqrt(1 - zeta ** 2);

        return { zeta, omega0, omega1 };
      } else {
        const { damping: c, mass: m, stiffness: k } = config;

        const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
        const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
        const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

        return { zeta, omega0, omega1 };
      }
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

    function calcuateNewMassToMatchDuration(x0: number) {
      /** Use this formula: https://phys.libretexts.org/Bookshelves/University_Physics/Book%3A_University_Physics_(OpenStax)/Book%3A_University_Physics_I_-_Mechanics_Sound_Oscillations_and_Waves_(OpenStax)/15%3A_Oscillations/15.06%3A_Damped_Oscillations
           * to find the asympotote and esitmate the damping that gives us the expected duration 

                ⎛ ⎛ c⎞           ⎞           
                ⎜-⎜──⎟ ⋅ duration⎟           
                ⎝ ⎝2m⎠           ⎠           
            A ⋅ e                   = treshold

     
          Amplitude calculated using "Conservation of energy"
                           _________________
                          ╱      2         2
                         ╱ m ⋅ v0  + k ⋅ x0 
          amplitude =   ╱  ─────────────────
                      ╲╱           k        

          And replace mass with damping ratio which is provided: m = (c^2)/(4 * k * zeta^2)   
          */
      const {
        duration,
        velocity: v0,
        stiffness: k,
        dampingRatio: zeta,
        restSpeedThreshold: threshold,
      } = config;

      const durationForMass = (mass: number) => {
        const amplitude = Math.sqrt((mass * v0 * v0 + k * x0 * x0) / k);
        const c = zeta * 2 * Math.sqrt(k * mass);
        return (
          1000 * ((-2 * mass) / c) * Math.log((threshold * 0.01) / amplitude) -
          duration
        );
      };

      return bisectRoot({ min: 0, max: 50, func: durationForMass });
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

      const { lastTimestamp, velocity } = animation;

      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;

      const t = deltaTime / 1000;
      const v0 = -velocity;
      const x0 = toValue - current;

      const { zeta, omega0, omega1 } = initialCalculations(animation.newMass);
      animation.lastTimestamp = now;

      const { position: newPosition, velocity: newVelocity } =
        zeta < 1
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

      let newMass = config.mass;

      if (userConfig?.duration) {
        let x0 = Number(animation.toValue) - value;
        if (Number(previousAnimation?.startValue)) {
          // It makes our animation a bit smoother, especially if sb triggered same animation twice
          x0 = Number(animation.toValue) - Number(previousAnimation.startValue);
        }

        newMass = calcuateNewMassToMatchDuration(x0);
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

        animation.newMass = newMass;
      } else {
        animation.lastTimestamp = now;
        animation.startTimestamp = now;
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
      newMass: 0,
    } as SpringAnimation;
  });
}
