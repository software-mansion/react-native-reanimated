import type { CSSTimingFunction } from '../easings';
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

export function validateStringEasing(
  easing: CSSTimingFunction | CSSTimingFunction[]
) {
  return (
    typeof easing === 'string' ||
    (Array.isArray(easing) &&
      easing.every((value) => typeof value === 'string'))
  );
}
