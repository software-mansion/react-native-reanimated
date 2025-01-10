import type { DimensionValue } from 'react-native';
import type { CSSTimingFunction } from '../../easings';
import { CubicBezierEasing, LinearEasing, StepsEasing } from '../../easings';
import { ReanimatedError } from '../../errors';
import type { ConvertValuesToArrays } from '../../types';

export function hasSuffix(value: unknown): value is string {
  return typeof value === 'string' && isNaN(parseInt(value[value.length - 1]));
}

export function maybeAddSuffix(value: unknown, suffix: string) {
  return hasSuffix(value) ? value : `${String(value)}${suffix}`;
}

export function maybeAddSuffixes<T, K extends keyof T>(
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

export function parseTimingFunction(
  timingFunction: CSSTimingFunction | CSSTimingFunction[]
) {
  if (Array.isArray(timingFunction)) {
    return timingFunction.map(easingMapper).join(', ');
  }

  return easingMapper(timingFunction);
}

export const parseDimensionValue = (value: DimensionValue) => {
  if (typeof value === 'object') {
    return;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (!hasSuffix(value)) {
    return `${value}px`;
  }

  return value;
};
