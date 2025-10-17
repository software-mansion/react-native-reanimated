'use strict';
import type { ColorValue, DimensionValue } from 'react-native';

import {
  hasSuffix,
  maybeAddSuffix,
  processColor,
  ReanimatedError,
} from '../../common';
import type { ParametrizedTimingFunction } from '../easing';
import { CubicBezierEasing, LinearEasing, StepsEasing } from '../easing';
import type { AddArrayPropertyType, ConvertValuesToArrays } from '../types';
import { kebabizeCamelCase } from '../utils';

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

export function parseDimensionValue(value: DimensionValue) {
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
}

export function opacifyColor(
  color: ColorValue,
  opacity: number
): string | null {
  const colorNumber = processColor(color);
  if (colorNumber == null) {
    return null;
  }

  const a = (colorNumber >> 24) & 0xff;
  const r = (colorNumber >> 16) & 0xff;
  const g = (colorNumber >> 8) & 0xff;
  const b = colorNumber & 0xff;

  // Combine the existing alpha with the new opacity
  const newAlpha = (a / 255) * opacity;

  return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
}
