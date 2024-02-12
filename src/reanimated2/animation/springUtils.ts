'use strict';
import type {
  Animation,
  AnimatableValue,
  Timestamp,
  ReduceMotion,
} from '../commonTypes';

/**
 * Spring animation configuration.
 *
 * @param mass - The weight of the spring. Reducing this value makes the animation faster. Defaults to 1.
 * @param damping - How quickly a spring slows down. Higher damping means the spring will come to rest faster. Defaults to 10.
 * @param duration - Length of the animation (in milliseconds). Defaults to 2000.
 * @param dampingRatio - How damped the spring is. Value 1 means the spring is critically damped, and value \>1 means the spring is overdamped. Defaults to 0.5.
 * @param stiffness - How bouncy the spring is. Defaults to 100.
 * @param velocity - Initial velocity applied to the spring equation. Defaults to 0.
 * @param overshootClamping - Whether a spring can bounce over the `toValue`. Defaults to false.
 * @param restDisplacementThreshold - The displacement below which the spring will snap to toValue without further oscillations. Defaults to 0.01.
 * @param restSpeedThreshold - The speed in pixels per second from which the spring will snap to toValue without further oscillations. Defaults to 2.
 * @param reduceMotion - Determines how the animation responds to the device's reduced motion accessibility setting. Default to `ReduceMotion.System` - {@link ReduceMotion}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/#config-
 */
export type SpringConfig = {
  stiffness?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
  velocity?: number;
  reduceMotion?: ReduceMotion;
} & (
  | {
      mass?: number;
      damping?: number;
      duration?: never;
      dampingRatio?: never;
      clamp?: never;
    }
  | {
      mass?: never;
      damping?: never;
      duration?: number;
      dampingRatio?: number;
      clamp?: { min?: number; max?: number };
    }
);

// This type contains all the properties from SpringConfig, which are changed to be required,
// except for optional 'reduceMotion' and 'clamp'
export type DefaultSpringConfig = {
  [K in keyof Required<SpringConfig>]: K extends 'reduceMotion' | 'clamp'
    ? Required<SpringConfig>[K] | undefined
    : Required<SpringConfig>[K];
};
export type WithSpringConfig = SpringConfig;

export interface SpringConfigInner {
  useDuration: boolean;
  skipAnimation: boolean;
}

export interface SpringAnimation extends Animation<SpringAnimation> {
  current: AnimatableValue;
  toValue: AnimatableValue;
  velocity: number;
  lastTimestamp: Timestamp;
  startTimestamp: Timestamp;
  startValue: number;
  zeta: number;
  omega0: number;
  omega1: number;
}

export interface InnerSpringAnimation
  extends Omit<SpringAnimation, 'toValue' | 'current'> {
  toValue: number;
  current: number;
}
export function checkIfConfigIsValid(config: DefaultSpringConfig): boolean {
  'worklet';
  let errorMessage = '';
  (
    [
      'stiffness',
      'damping',
      'dampingRatio',
      'restDisplacementThreshold',
      'restSpeedThreshold',
      'mass',
    ] as const
  ).forEach((prop) => {
    const value = config[prop];
    if (value <= 0) {
      errorMessage += `, ${prop} must be grater than zero but got ${value}`;
    }
  });

  if (config.duration < 0) {
    errorMessage += `, duration can't be negative, got ${config.duration}`;
  }

  if (
    config.clamp?.min &&
    config.clamp?.max &&
    config.clamp.min > config.clamp.max
  ) {
    errorMessage += `, clamp.min should be lower than clamp.max, got clamp: {min: ${config.clamp.min}, max: ${config.clamp.max}} `;
  }

  if (errorMessage !== '') {
    console.warn('[Reanimated] Invalid spring config' + errorMessage);
  }

  return errorMessage === '';
}

// ts-prune-ignore-next This function is exported to be tested
export function bisectRoot({
  min,
  max,
  func,
  maxIterations = 20,
}: {
  min: number;
  max: number;
  func: (x: number) => number;
  maxIterations?: number;
}) {
  'worklet';
  const ACCURACY = 0.00005;
  let idx = maxIterations;
  let current = (max + min) / 2;
  while (Math.abs(func(current)) > ACCURACY && idx > 0) {
    idx -= 1;

    if (func(current) < 0) {
      min = current;
    } else {
      max = current;
    }
    current = (min + max) / 2;
  }
  return current;
}

export function initialCalculations(
  mass = 0,
  config: DefaultSpringConfig & SpringConfigInner
): {
  zeta: number;
  omega0: number;
  omega1: number;
} {
  'worklet';

  if (config.skipAnimation) {
    return { zeta: 0, omega0: 0, omega1: 0 };
  }

  if (config.useDuration) {
    const { stiffness: k, dampingRatio: zeta } = config;

    /** omega0 and omega1 denote angular frequency and natural angular frequency, see this link for formulas:
     *  https://courses.lumenlearning.com/suny-osuniversityphysics/chapter/15-5-damped-oscillations/
     */
    const omega0 = Math.sqrt(k / mass);
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

/** We make an assumption that we can manipulate zeta without changing duration of movement.
 *  According to theory this change is small and tests shows that we can indeed ignore it.
 */
export function scaleZetaToMatchClamps(
  animation: SpringAnimation,
  clamp: { min?: number; max?: number }
): number {
  'worklet';
  const { zeta, toValue, startValue } = animation;
  const toValueNum = Number(toValue);

  if (toValueNum === startValue) {
    return zeta;
  }

  const [firstBound, secondBound] =
    toValueNum - startValue > 0
      ? [clamp.min, clamp.max]
      : [clamp.max, clamp.min];

  /** The extrema we get from equation below are relative (we obtain a ratio),
   *  To get absolute extrema we convert it as follows:
   *
   *  AbsoluteExtremum = startValue ± RelativeExtremum * (toValue - startValue)
   *  Where ± denotes:
   *    + if extremum is over the target
   *    - otherwise
   */

  const relativeExtremum1 =
    secondBound !== undefined
      ? Math.abs((secondBound - toValueNum) / (toValueNum - startValue))
      : undefined;

  const relativeExtremum2 =
    firstBound !== undefined
      ? Math.abs((firstBound - toValueNum) / (toValueNum - startValue))
      : undefined;

  /** Use this formula http://hyperphysics.phy-astr.gsu.edu/hbase/oscda.html to calculate
   *  first two extrema. These extrema are located where cos = +- 1
   *
   *  Therefore the first two extrema are:
   *
   *     Math.exp(-zeta * Math.PI);      (over the target)
   *     Math.exp(-zeta * 2 * Math.PI);  (before the target)
   */

  const newZeta1 =
    relativeExtremum1 !== undefined
      ? Math.abs(Math.log(relativeExtremum1) / Math.PI)
      : undefined;

  const newZeta2 =
    relativeExtremum2 !== undefined
      ? Math.abs(Math.log(relativeExtremum2) / (2 * Math.PI))
      : undefined;

  const zetaSatisfyingClamp = [newZeta1, newZeta2].filter(
    (x: number | undefined): x is number => x !== undefined
  );
  // The bigger is zeta the smaller are bounces, we return the biggest one
  // because it should satisfy all conditions
  return Math.max(...zetaSatisfyingClamp, zeta);
}

/** Runs before initial */
export function calculateNewMassToMatchDuration(
  x0: number,
  config: DefaultSpringConfig & SpringConfigInner,
  v0: number
) {
  'worklet';
  if (config.skipAnimation) {
    return 0;
  }

  /** Use this formula: https://phys.libretexts.org/Bookshelves/University_Physics/Book%3A_University_Physics_(OpenStax)/Book%3A_University_Physics_I_-_Mechanics_Sound_Oscillations_and_Waves_(OpenStax)/15%3A_Oscillations/15.06%3A_Damped_Oscillations
       * to find the asymptote and estimate the damping that gives us the expected duration 

            ⎛ ⎛ c⎞           ⎞           
            ⎜-⎜──⎟ ⋅ duration⎟           
            ⎝ ⎝2m⎠           ⎠           
       A ⋅ e                   = threshold

 
      Amplitude calculated using "Conservation of energy"
                       _________________
                      ╱      2         2
                     ╱ m ⋅ v0  + k ⋅ x0 
      amplitude =   ╱  ─────────────────
                  ╲╱           k        

      And replace mass with damping ratio which is provided: m = (c^2)/(4 * k * zeta^2)   
      */
  const {
    stiffness: k,
    dampingRatio: zeta,
    restSpeedThreshold: threshold,
    duration,
  } = config;

  const durationForMass = (mass: number) => {
    'worklet';
    const amplitude =
      (mass * v0 * v0 + k * x0 * x0) / (Math.exp(1 - 0.5 * zeta) * k);
    const c = zeta * 2 * Math.sqrt(k * mass);
    return (
      1000 * ((-2 * mass) / c) * Math.log((threshold * 0.01) / amplitude) -
      duration
    );
  };

  // Bisection turns out to be much faster than Newton's method in our case
  return bisectRoot({ min: 0, max: 100, func: durationForMass });
}

export function criticallyDampedSpringCalculations(
  animation: InnerSpringAnimation,
  precalculatedValues: {
    v0: number;
    x0: number;
    omega0: number;
    t: number;
  }
): { position: number; velocity: number } {
  'worklet';
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

export function underDampedSpringCalculations(
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
  'worklet';
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

export function isAnimationTerminatingCalculation(
  animation: InnerSpringAnimation,
  config: DefaultSpringConfig
): {
  isOvershooting: boolean;
  isVelocity: boolean;
  isDisplacement: boolean;
} {
  'worklet';
  const { toValue, velocity, startValue, current } = animation;

  const isOvershooting = config.overshootClamping
    ? (current > toValue && startValue < toValue) ||
      (current < toValue && startValue > toValue)
    : false;

  const isVelocity = Math.abs(velocity) < config.restSpeedThreshold;
  const isDisplacement =
    Math.abs(toValue - current) < config.restDisplacementThreshold;

  return { isOvershooting, isVelocity, isDisplacement };
}
