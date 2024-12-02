'use strict';
import { ReanimatedError } from '../../errors';
import type { NormalizedTransformOrigin, TransformOrigin } from '../../types';

type KeywordConversions = Record<string, `${number}%` | number>;

const HORIZONTAL_KEYWORDS: KeywordConversions = {
  left: 0,
  center: '50%',
  right: '100%',
} satisfies KeywordConversions;

const VERTICAL_KEYWORDS = {
  top: 0,
  center: '50%',
  bottom: '100%',
} satisfies KeywordConversions;

export const ERROR_MESSAGES = {
  invalidTransformOrigin: (value: TransformOrigin) =>
    `Invalid transformOrigin: ${JSON.stringify(value)}. Expected 1-3 values.`,
  invalidComponent: (component: string | number, origin: TransformOrigin) =>
    `Invalid component "${component}" in transformOrigin ${JSON.stringify(origin)}. Must be a number, percentage, or a valid keyword.`,
  invalidKeyword: (keyword: string, axis: 'x' | 'y', validKeywords: string[]) =>
    `"${keyword}" is not a valid keyword for the ${axis}-axis. Must be one of: ${validKeywords.join(', ')}.`,
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

  return validateResult(result, components, transformOrigin);
}

function normalizeComponent(
  component: string | number,
  keywords?: KeywordConversions
): number | `${number}%` | null {
  if (keywords && component in keywords) {
    return keywords[component];
  } else if (typeof component === 'number') {
    return component;
  }

  const num = parseFloat(component);
  if (!isNaN(num)) {
    if (component.endsWith('%') && num !== 0) {
      return `${num}%`;
    }
    return num;
  }

  return null;
}

function validateResult(
  result: Array<null | `${number}%` | number>,
  components: (string | number)[],
  transformOrigin: TransformOrigin
): NormalizedTransformOrigin {
  const nullIdx = result.indexOf(null);

  if (nullIdx !== -1) {
    const invalidComponent = components[nullIdx];

    if (nullIdx === 0 && invalidComponent in VERTICAL_KEYWORDS) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidKeyword(
          invalidComponent as string,
          'x',
          Object.keys(HORIZONTAL_KEYWORDS)
        )
      );
    }
    if (nullIdx === 1 && invalidComponent in HORIZONTAL_KEYWORDS) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidKeyword(
          invalidComponent as string,
          'y',
          Object.keys(VERTICAL_KEYWORDS)
        )
      );
    }

    throw new ReanimatedError(
      ERROR_MESSAGES.invalidComponent(components[nullIdx], transformOrigin)
    );
  }

  if (result[2] !== undefined && typeof result[2] !== 'number') {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidComponent(components[2], transformOrigin)
    );
  }

  return result as NormalizedTransformOrigin;
}
