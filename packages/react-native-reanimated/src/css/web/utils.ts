'use strict';
import type { ConvertValuesToArrays } from '../../common';
import {
  kebabizeCamelCase,
  maybeAddSuffix,
  ReanimatedError,
} from '../../common';
import type { ParametrizedTimingFunction } from '../easing';
import { CubicBezierEasing, LinearEasing, StepsEasing } from '../easing';
import type { AddArrayPropertyType } from '../types';

export function maybeAddSuffixes<T, K extends keyof T>(
  object: ConvertValuesToArrays<T>,
  key: K,
  suffix: string
) {
  if (!(key in object)) {
    return [];
  }

  return object[key].map((value) => maybeAddSuffix(value, suffix));
}

function easingMapper(easing: ParametrizedTimingFunction | string) {
  if (typeof easing === 'string') {
    return easing;
  }

  if (easing instanceof StepsEasing) {
    return `steps(${easing.stepsNumber}, ${kebabizeCamelCase(easing.modifier)})`;
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
  timingFunction: AddArrayPropertyType<ParametrizedTimingFunction | string>
) {
  if (Array.isArray(timingFunction)) {
    return timingFunction.map(easingMapper).join(', ');
  }

  return easingMapper(timingFunction);
}
