import type { CSSTimingFunction } from '../easings';
import { CubicBezierEasing, LinearEasing, StepsEasing } from '../easings';
import { ReanimatedError } from '../errors';
import type { ConvertValuesToArrays } from '../types';

export const hasSuffix = (value: unknown): value is string =>
  typeof value === 'string' && isNaN(parseInt(value[value.length - 1]));

export function kebabize<T extends string>(property: T) {
  return property
    .split('')
    .map((letter, index) =>
      letter.toUpperCase() === letter
        ? `${index !== 0 ? '-' : ''}${letter.toLowerCase()}`
        : letter
    )
    .join('');
}

export function maybeAddSuffix<T, K extends keyof T>(
  object: ConvertValuesToArrays<T>,
  key: K,
  suffix: string
) {
  if (!(key in object)) {
    return;
  }

  return object[key].map((value) =>
    hasSuffix(value) ? String(value) : `${String(value)}${suffix}`
  );
}

function easingMapper(easing: CSSTimingFunction) {
  if (typeof easing === 'string') {
    return kebabize(easing);
  }

  if (easing instanceof StepsEasing) {
    return `steps(${easing.stepsNumber}, ${kebabize(easing.modifier)})`;
  }

  if (easing instanceof CubicBezierEasing) {
    return `cubic-bezier(${easing.x1}, ${easing.y1}, ${easing.x2}, ${easing.y2})`;
  }

  if (easing instanceof LinearEasing) {
    const values = easing.points
      .map((point) => (Array.isArray(point) ? point.join(' ') : point))
      .join(', ');

    return `linear(${values})`;
  }

  throw new ReanimatedError(`Invalid timing function ${easing.toString()}`);
}

export function parseTimingFunction(timingFunction: CSSTimingFunction[]) {
  return timingFunction.map(easingMapper).join(', ');
}
