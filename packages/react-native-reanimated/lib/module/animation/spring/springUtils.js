'use strict';

import { logger } from '../../common';

// This type contains all the properties from SpringConfig, which are changed to be required,
// except for optional 'reduceMotion' and 'clamp'

export function checkIfConfigIsValid(config) {
  'worklet';

  let errorMessage = '';
  ['stiffness', 'damping', 'dampingRatio', 'mass', 'energyThreshold'].forEach(prop => {
    const value = config[prop];
    if (value <= 0) {
      errorMessage += `, ${prop} must be grater than zero but got ${value}`;
    }
  });
  if (config.duration < 0) {
    errorMessage += `, duration can't be negative, got ${config.duration}`;
  }
  if (config.clamp?.min && config.clamp?.max && config.clamp.min > config.clamp.max) {
    errorMessage += `, clamp.min should be lower than clamp.max, got clamp: {min: ${config.clamp.min}, max: ${config.clamp.max}} `;
  }
  if (errorMessage !== '') {
    logger.warn('Invalid spring config' + errorMessage);
  }
  return errorMessage === '';
}
function bisectRoot({
  min,
  max,
  func,
  precision,
  maxIterations = 20
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
export function initialCalculations(stiffness = 0, config) {
  'worklet';

  if (config.skipAnimation) {
    return {
      zeta: 0,
      omega0: 0,
      omega1: 0
    };
  }
  if (config.useDuration) {
    const {
      mass: m,
      dampingRatio: zeta
    } = config;

    /**
     * Omega0 and omega1 denote angular frequency and natural angular frequency,
     * see this link for formulas:
     * https://courses.lumenlearning.com/suny-osuniversityphysics/chapter/15-5-damped-oscillations/
     */
    const omega0 = Math.sqrt(stiffness / m);
    const omega1 = omega0 * Math.sqrt(1 - zeta ** 2);
    return {
      zeta,
      omega0,
      omega1
    };
  } else {
    const {
      damping: c,
      mass: m,
      stiffness: k
    } = config;
    const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
    const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
    const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

    return {
      zeta,
      omega0,
      omega1
    };
  }
}

/**
 * We make an assumption that we can manipulate zeta without changing duration
 * of movement. According to theory this change is small and tests shows that we
 * can indeed ignore it.
 */
export function scaleZetaToMatchClamps(animation, clamp) {
  'worklet';

  const {
    zeta,
    toValue,
    startValue
  } = animation;
  const toValueNum = Number(toValue);
  if (startValue === 0) {
    return zeta;
  }
  const [firstBound, secondBound] = startValue <= 0 ? [clamp.min, clamp.max] : [clamp.max, clamp.min];

  /**
   * The extrema we get from equation below are relative (we obtain a ratio), To
   * get absolute extrema we convert it as follows:
   *
   * AbsoluteExtremum = startValue ± RelativeExtremum * (toValue - startValue)
   * Where ± denotes:
   *
   * - If extremum is over the target
   * - Otherwise
   */

  const relativeExtremum1 = secondBound !== undefined ? Math.abs((secondBound - toValueNum) / startValue) : undefined;
  const relativeExtremum2 = firstBound !== undefined ? Math.abs((firstBound - toValueNum) / startValue) : undefined;

  /**
   * Use this formula http://hyperphysics.phy-astr.gsu.edu/hbase/oscda.html to
   * calculate first two extrema. These extrema are located where cos = +- 1
   *
   * Therefore the first two extrema are:
   *
   *     Math.exp(-zeta * Math.PI);      (over the target)
   *     Math.exp(-zeta * 2 * Math.PI);  (before the target)
   */

  const newZeta1 = relativeExtremum1 !== undefined ? Math.abs(Math.log(relativeExtremum1) / Math.PI) : undefined;
  const newZeta2 = relativeExtremum2 !== undefined ? Math.abs(Math.log(relativeExtremum2) / (2 * Math.PI)) : undefined;
  const zetaSatisfyingClamp = [newZeta1, newZeta2].filter(x => x !== undefined);
  // The bigger is zeta the smaller are bounces, we return the biggest one
  // because it should satisfy all conditions
  return Math.max(...zetaSatisfyingClamp, zeta);
}
export function getEnergy(displacement, velocity, stiffness, mass) {
  'worklet';

  const potentialEnergy = 0.5 * stiffness * displacement ** 2;
  const kineticEnergy = 0.5 * mass * velocity ** 2;
  return potentialEnergy + kineticEnergy;
}

/** Runs before initial */
export function calculateNewStiffnessToMatchDuration(x0, config, v0) {
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
   *             ⎛ ⎛ c⎞           ⎞
   *             ⎜-⎜──⎟ ⋅ duration⎟
   *             ⎝ ⎝2m⎠           ⎠
   *        A ⋅ e                   = threshold
   */
  const {
    dampingRatio: zeta,
    energyThreshold: threshold,
    mass: m,
    duration: targetDuration
  } = config;
  const energyDiffForStiffness = stiffness => {
    'worklet';

    const perceptualCoefficient = 1.5;
    const MILLISECONDS_IN_SECOND = 1000;
    const settlingDuration = targetDuration * perceptualCoefficient / MILLISECONDS_IN_SECOND;
    const omega0 = Math.sqrt(stiffness / m) * zeta;
    const xtk = (x0 + (v0 + x0 * omega0) * settlingDuration) * Math.exp(-omega0 * settlingDuration);
    const vtk = (x0 + (v0 + x0 * omega0) * settlingDuration) * Math.exp(-omega0 * settlingDuration) * -omega0 + (v0 + x0 * omega0) * Math.exp(-omega0 * settlingDuration);
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
    maxIterations: 100
  });
}
export function criticallyDampedSpringCalculations(animation, precalculatedValues) {
  'worklet';

  const {
    toValue
  } = animation;
  const {
    v0,
    x0,
    omega0,
    t
  } = precalculatedValues;
  const criticallyDampedEnvelope = Math.exp(-omega0 * t);
  const criticallyDampedPosition = toValue + criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);
  const criticallyDampedVelocity = criticallyDampedEnvelope * -omega0 * (x0 + (v0 + omega0 * x0) * t) + criticallyDampedEnvelope * (v0 + omega0 * x0);
  return {
    position: criticallyDampedPosition,
    velocity: criticallyDampedVelocity
  };
}
export function underDampedSpringCalculations(animation, precalculatedValues) {
  'worklet';

  const {
    toValue
  } = animation;
  const {
    zeta,
    t,
    omega0,
    omega1,
    x0,
    v0
  } = precalculatedValues;
  const sin1 = Math.sin(omega1 * t);
  const cos1 = Math.cos(omega1 * t);

  // under damped
  const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
  const underDampedFrag1 = underDampedEnvelope * (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);
  const underDampedPosition = toValue + underDampedFrag1;
  // This looks crazy -- it's actually just the derivative of the oscillation function
  const underDampedVelocity = -zeta * omega0 * underDampedFrag1 + underDampedEnvelope * (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);
  return {
    position: underDampedPosition,
    velocity: underDampedVelocity
  };
}
export function isAnimationTerminatingCalculation(animation, config) {
  'worklet';

  const {
    toValue,
    velocity,
    startValue,
    current,
    initialEnergy
  } = animation;
  if (config.overshootClamping) {
    const leftBound = startValue >= 0 ? toValue : toValue + startValue;
    const rightBound = leftBound + Math.abs(startValue);
    if (current < leftBound || current > rightBound) {
      return true;
    }
  }
  const currentEnergy = getEnergy(toValue - current, velocity, config.stiffness, config.mass);
  return initialEnergy === 0 || currentEnergy / initialEnergy <= config.energyThreshold;
}
//# sourceMappingURL=springUtils.js.map