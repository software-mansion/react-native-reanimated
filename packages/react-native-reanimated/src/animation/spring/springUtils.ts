'use strict';
import { logger } from '../../common';
import type { AnimatableValue, Animation, Timestamp } from '../../commonTypes';
import type { SpringConfig } from './springConfigs';

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

export type ResolvableSpringConfig = Omit<
  DefaultSpringConfig & SpringConfigInner,
  'reduceMotion'
>;

export type ResolvedSpring = {
  zeta: number;
  omega0: number;
  omega1: number;
  stiffness: number;
  /**
   * True when `clamp` raised `zeta`. The motion then keeps `omega1`, so its
   * energy can increase again after it is below `energyThreshold`.
   */
  clampRaisesZeta: boolean;
};

/**
 * The state of a spring at its start: the displacement `x0` from `toValue`, the
 * played velocity `v0` and the start energy of the end rule, which uses the
 * velocity of the configuration.
 */
type SpringStart = {
  x0: number;
  v0: number;
  resolved: ResolvedSpring;
  initialEnergy: number;
};

type SpringState = { displacement: number; velocity: number };

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
  initialEnergy: number;
}

export interface InnerSpringAnimation extends Omit<
  SpringAnimation,
  'toValue' | 'current'
> {
  toValue: number;
  current: number;
}

export const LARGEST_SPRING_STEP_MS = 64;
const SETTLE_TIME_TOLERANCE_S = 1e-12;

export function checkIfConfigIsValid(config: DefaultSpringConfig): boolean {
  'worklet';
  let errorMessage = '';
  (
    ['stiffness', 'damping', 'dampingRatio', 'mass', 'energyThreshold'] as const
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
    logger.warn('Invalid spring config' + errorMessage);
  }

  return errorMessage === '';
}

export function safeMergeConfigs<TConfig extends object>(
  defaults: TConfig,
  userConfig?: Partial<TConfig>
): TConfig {
  'worklet';
  if (!userConfig) {
    return defaults;
  }

  const filtered = Object.fromEntries(
    Object.entries(userConfig).filter(([, v]) => v !== undefined)
  ) as Partial<TConfig>;

  return {
    ...defaults,
    ...filtered,
  };
}

function bisectRoot({
  min,
  max,
  func,
  precision,
  maxIterations = 20,
}: {
  min: number;
  max: number;
  func: (x: number) => number;
  precision: number;
  maxIterations?: number;
}) {
  'worklet';
  const direction = func(max) >= func(min) ? 1 : -1;
  let idx = maxIterations;
  let current = (max + min) / 2;
  while (Math.abs(func(current)) > precision && idx > 0) {
    idx -= 1;

    if (func(current) * direction < 0) {
      min = current;
    } else {
      max = current;
    }
    current = (min + max) / 2;
  }
  return current;
}

function initialCalculations(
  stiffness = 0,
  config: ResolvableSpringConfig
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
    const { mass: m, dampingRatio: zeta } = config;

    /**
     * Omega0 and omega1 denote angular frequency and natural angular frequency,
     * see this link for formulas:
     * https://courses.lumenlearning.com/suny-osuniversityphysics/chapter/15-5-damped-oscillations/
     */
    const omega0 = Math.sqrt(stiffness / m);
    const omega1 = zeta < 1 ? omega0 * Math.sqrt(1 - zeta ** 2) : 0;

    return { zeta, omega0, omega1 };
  } else {
    const { damping: c, mass: m, stiffness: k } = config;

    const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
    const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
    const omega1 = zeta < 1 ? omega0 * Math.sqrt(1 - zeta ** 2) : 0; // exponential decay

    return { zeta, omega0, omega1 };
  }
}

/**
 * We make an assumption that we can manipulate zeta without changing duration
 * of movement. According to theory this change is small and tests shows that we
 * can indeed ignore it.
 */
function scaleZetaToMatchClamps(
  zeta: number,
  toValue: number,
  x0: number,
  clamp: { min?: number; max?: number }
): number {
  'worklet';
  if (x0 === 0) {
    return zeta;
  }

  const [firstBound, secondBound] =
    x0 <= 0 ? [clamp.min, clamp.max] : [clamp.max, clamp.min];

  /**
   * The extrema we get from equation below are relative (we obtain a ratio), To
   * get absolute extrema we convert it as follows:
   *
   * AbsoluteExtremum = x0 ± RelativeExtremum * (toValue - x0) Where ± denotes:
   *
   * - If extremum is over the target
   * - Otherwise
   */

  const relativeExtremum1 =
    secondBound !== undefined
      ? Math.abs((secondBound - toValue) / x0)
      : undefined;

  const relativeExtremum2 =
    firstBound !== undefined
      ? Math.abs((firstBound - toValue) / x0)
      : undefined;

  /**
   * Use this formula http://hyperphysics.phy-astr.gsu.edu/hbase/oscda.html to
   * calculate first two extrema. These extrema are located where cos = +- 1
   *
   * Therefore the first two extrema are:
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

function getEnergy(
  displacement: number,
  velocity: number,
  stiffness: number,
  mass: number
) {
  'worklet';
  const potentialEnergy = 0.5 * stiffness * displacement ** 2;
  const kineticEnergy = 0.5 * mass * velocity ** 2;
  return potentialEnergy + kineticEnergy;
}

/** Runs before initial */
function calculateNewStiffnessToMatchDuration(
  x0: number,
  config: ResolvableSpringConfig,
  v0: number
) {
  'worklet';
  if (config.skipAnimation) {
    return 0;
  }

  /**
   * Use this formula:
   * https://phys.libretexts.org/Bookshelves/University_Physics/Book%3A_University_Physics_(OpenStax)/Book%3A_University_Physics_I_-_Mechanics_Sound_Oscillations_and_Waves_(OpenStax)/15%3A_Oscillations/15.06%3A_Damped_Oscillations
   * to find the asymptote and estimate the damping that gives us the expected
   * duration
   *
   *          ⎛ ⎛ c⎞           ⎞
   *          ⎜-⎜──⎟ ⋅ duration⎟
   *          ⎝ ⎝2m⎠           ⎠
   *     A ⋅ e                   = threshold
   */
  const {
    dampingRatio: zeta,
    energyThreshold: threshold,
    mass: m,
    duration: targetDuration,
  } = config;

  const energyDiffForStiffness = (stiffness: number) => {
    'worklet';
    const perceptualCoefficient = 1.5;
    const MILLISECONDS_IN_SECOND = 1000;

    const settlingDuration =
      (targetDuration * perceptualCoefficient) / MILLISECONDS_IN_SECOND;
    const omega0 = Math.sqrt(stiffness / m) * zeta;

    const xtk =
      (x0 + (v0 + x0 * omega0) * settlingDuration) *
      Math.exp(-omega0 * settlingDuration);

    const vtk =
      (x0 + (v0 + x0 * omega0) * settlingDuration) *
        Math.exp(-omega0 * settlingDuration) *
        -omega0 +
      (v0 + x0 * omega0) * Math.exp(-omega0 * settlingDuration);

    const e0 = getEnergy(x0, v0, stiffness, m);

    const etk = getEnergy(xtk, vtk, stiffness, m);

    const energyFraction = etk / e0;

    return energyFraction - threshold;
  };

  const precision = config.energyThreshold * 1e-3; // Experimentally seems to be good enough.

  // Bisection turns out to be much faster than Newton's method in our case
  return bisectRoot({
    min: Number.EPSILON,
    max: 8e3 /* Stiffness for 8ms animation doesn't exceed 2e3, we add some safety margin on top of that. */,
    func: energyDiffForStiffness,
    precision,
    maxIterations: 100,
  });
}

function criticallyDampedSpringCalculations(precalculatedValues: {
  v0: number;
  x0: number;
  omega0: number;
  t: number;
}): SpringState {
  'worklet';
  const { v0, x0, omega0, t } = precalculatedValues;

  const criticallyDampedEnvelope = Math.exp(-omega0 * t);
  const criticallyDampedDisplacement =
    criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

  const criticallyDampedVelocity =
    criticallyDampedEnvelope * -omega0 * (x0 + (v0 + omega0 * x0) * t) +
    criticallyDampedEnvelope * (v0 + omega0 * x0);

  return {
    displacement: criticallyDampedDisplacement,
    velocity: criticallyDampedVelocity,
  };
}

function underDampedSpringCalculations(precalculatedValues: {
  zeta: number;
  v0: number;
  x0: number;
  omega0: number;
  omega1: number;
  t: number;
}): SpringState {
  'worklet';
  const { zeta, t, omega0, omega1, x0, v0 } = precalculatedValues;

  const sin1 = Math.sin(omega1 * t);
  const cos1 = Math.cos(omega1 * t);

  // under damped
  const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
  const underDampedFrag1 =
    underDampedEnvelope *
    (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);

  // This looks crazy -- it's actually just the derivative of the oscillation function
  const underDampedVelocity =
    -zeta * omega0 * underDampedFrag1 +
    underDampedEnvelope *
      (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

  return { displacement: underDampedFrag1, velocity: underDampedVelocity };
}

export function isAnimationTerminatingCalculation(
  animation: InnerSpringAnimation,
  config: DefaultSpringConfig & SpringConfigInner
): boolean {
  'worklet';
  const { toValue, velocity, startValue, current, initialEnergy } = animation;

  if (config.overshootClamping) {
    const leftBound = startValue >= 0 ? toValue : toValue + startValue;
    const rightBound = leftBound + Math.abs(startValue);
    if (current < leftBound || current > rightBound) {
      return true;
    }
  }
  const currentEnergy = getEnergy(
    toValue - current,
    velocity,
    config.stiffness,
    config.mass
  );

  return (
    initialEnergy === 0 ||
    currentEnergy / initialEnergy <= config.energyThreshold
  );
}

function firstTimeWhere(
  predicate: (t: number) => boolean,
  step: number,
  longestTime: number
) {
  'worklet';
  if (!Number.isFinite(step) || step <= 0) {
    return Infinity;
  }
  if (predicate(0)) {
    return 0;
  }
  let before = 0;
  let after = step;
  while (!predicate(after)) {
    if (after > longestTime) {
      return Infinity;
    }
    before = after;
    after += step;
  }
  while (after - before > SETTLE_TIME_TOLERANCE_S) {
    const middle = (before + after) / 2;
    if (predicate(middle)) {
      after = middle;
    } else {
      before = middle;
    }
  }
  return after;
}

/**
 * The rates in 1/s of the motion of `springStateAt`: `decay` of its envelope
 * and `frequency` of its oscillation, 0 for `zeta` 1 or more.
 */
export function springRatesOf({
  zeta,
  omega0,
  omega1,
}: Pick<ResolvedSpring, 'zeta' | 'omega0' | 'omega1'>): {
  decay: number;
  frequency: number;
} {
  'worklet';
  return zeta < 1
    ? { decay: zeta * omega0, frequency: omega1 }
    : { decay: omega0, frequency: 0 };
}

function scanStep(resolved: ResolvedSpring) {
  'worklet';
  const { decay, frequency } = springRatesOf(resolved);
  return 1 / (4 * Math.hypot(decay, frequency));
}

function resolveSpring(
  config: ResolvableSpringConfig,
  toValue: number,
  x0: number,
  v0: number
): ResolvedSpring {
  'worklet';
  const stiffness = config.useDuration
    ? calculateNewStiffnessToMatchDuration(x0, config, v0)
    : config.stiffness;
  const { zeta, omega0, omega1 } = initialCalculations(stiffness, config);
  const playedZeta =
    config.clamp === undefined
      ? zeta
      : scaleZetaToMatchClamps(zeta, toValue, x0, config.clamp);

  return {
    zeta: playedZeta,
    omega0,
    omega1,
    stiffness,
    clampRaisesZeta: playedZeta > zeta,
  };
}

export function velocityTowardTarget(
  velocity: number,
  displacement: number
): number {
  'worklet';
  const pointsAway =
    (displacement < 0 && velocity < 0) || (displacement > 0 && velocity > 0);
  return pointsAway ? 0 : velocity;
}

export function springStateAt(
  { zeta, omega0, omega1 }: Pick<ResolvedSpring, 'zeta' | 'omega0' | 'omega1'>,
  x0: number,
  v0: number,
  t: number
): SpringState {
  'worklet';
  return zeta < 1
    ? underDampedSpringCalculations({ zeta, v0, x0, omega0, omega1, t })
    : criticallyDampedSpringCalculations({ v0, x0, omega0, t });
}

export function initialEnergyOf(
  x0: number,
  stiffness: number,
  config: ResolvableSpringConfig
): number {
  'worklet';
  return getEnergy(x0, config.velocity, stiffness, config.mass);
}

/**
 * The start of a spring from `start` to `toValue`. `velocity` is the velocity
 * before the clip of `velocityTowardTarget`.
 */
export function springStartOf(
  config: ResolvableSpringConfig,
  toValue: number,
  start: number,
  velocity: number
): SpringStart {
  'worklet';
  const x0 = start - toValue;
  const v0 = velocityTowardTarget(velocity, x0);
  const resolved = resolveSpring(config, toValue, x0, v0);
  return {
    x0,
    v0,
    resolved,
    initialEnergy: initialEnergyOf(x0, resolved.stiffness, config),
  };
}

/**
 * Gives the first time in ms at which `isAnimationTerminatingCalculation` is
 * true for the continuous motion, or `Infinity` after `longestMs`. It uses the
 * state divided by `x0`, so equal normalized inputs give equal times. `x0` and
 * `initialEnergy` are not 0.
 */
export function springSettleTime(
  config: ResolvableSpringConfig,
  { x0, v0, resolved, initialEnergy }: SpringStart,
  longestMs: number
): number {
  'worklet';
  const { stiffness } = resolved;
  const { mass, energyThreshold } = config;
  const startEnergy = initialEnergy / x0 ** 2;

  const hasEnded = (t: number) => {
    'worklet';
    const { displacement, velocity } = springStateAt(resolved, 1, v0 / x0, t);
    if (config.overshootClamping && (displacement < 0 || displacement > 1)) {
      return true;
    }
    const energy = getEnergy(displacement, velocity, stiffness, mass);
    return energy / startEnergy <= energyThreshold;
  };

  return firstTimeWhere(hasEnded, scanStep(resolved), longestMs / 1000) * 1000;
}
