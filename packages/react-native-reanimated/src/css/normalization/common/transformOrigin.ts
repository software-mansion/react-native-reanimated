'use strict';
import { ReanimatedError } from '../../../errors';
import type { NormalizedTransformOrigin, TransformOrigin } from '../../types';

const HORIZONTAL_KEYWORDS = {
  left: '0%',
  center: '50%',
  right: '100%',
} as const;
const VERTICAL_KEYWORDS = { top: '0%', center: '50%', bottom: '100%' } as const;

const ERROR_MESSAGES = {
  invalidTransformOrigin: (value: TransformOrigin) =>
    `Invalid transformOrigin: ${JSON.stringify(value)}. Expected 1-3 values.`,
  invalidComponent: (component: string | number, origin: TransformOrigin) =>
    `Invalid component "${component}" in transformOrigin ${JSON.stringify(origin)}. Must be a number, percentage, or a valid keyword. Ensure the order of x and y components is correct.`,
};

export function normalizeTransformOrigin(
  transformOrigin: TransformOrigin
): NormalizedTransformOrigin {
  const components = Array.isArray(transformOrigin)
    ? transformOrigin
    : transformOrigin.split(/\s+/);

  if (components.length < 1 || components.length > 3) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidTransformOrigin(transformOrigin)
    );
  }

  // Swap x and y components if they are in the wrong order
  if (
    components[0] in VERTICAL_KEYWORDS &&
    (components[1] === undefined || components[1] in HORIZONTAL_KEYWORDS)
  ) {
    [components[0], components[1]] = [components[1], components[0]];
  }

  const result = [
    normalizeComponent(components[0] ?? '50%', HORIZONTAL_KEYWORDS),
    normalizeComponent(components[1] ?? '50%', VERTICAL_KEYWORDS),
    normalizeComponent(components[2] ?? 0),
  ];

  const invalidIdx = result.indexOf(null);
  if (invalidIdx !== -1) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidComponent(components[invalidIdx], transformOrigin)
    );
  }

  return result as NormalizedTransformOrigin;
}

function normalizeComponent(
  component: string | number,
  keywords?: Record<string, `${number}%`>
): number | `${number}%` | null {
  if (keywords && component in keywords) {
    return keywords[component];
  } else if (typeof component === 'number') {
    return component;
  }

  const num = parseFloat(component);
  if (!isNaN(num)) {
    if (component.endsWith('%')) {
      return `${num}%`;
    }
    return num;
  }

  return null;
}
