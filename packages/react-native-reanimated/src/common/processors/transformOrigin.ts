'use strict';
'worklet';
import { ReanimatedError } from '../errors';
import type { TransformOrigin, ValueProcessor } from '../types';

type Axis = 'x' | 'y' | 'z';
type ConvertedValue = `${number}%` | number;
type KeywordConversions = Record<string, ConvertedValue>;
type CustomParse = (value: string) => ConvertedValue | null;

const HORIZONTAL_CONVERSIONS = {
  left: 0,
  center: '50%',
  right: '100%',
} satisfies KeywordConversions;

const VERTICAL_CONVERSIONS = {
  top: 0,
  center: '50%',
  bottom: '100%',
} satisfies KeywordConversions;

function getAllowedValues(axis: Axis, isArray: boolean): string {
  const allowed: string[] = [];

  if (isArray) {
    allowed.push('numbers');
  } else {
    allowed.push('numbers with px unit');
  }

  allowed.push('percentages');

  let keywords: string[] = [];
  switch (axis) {
    case 'x':
      keywords = Object.keys(HORIZONTAL_CONVERSIONS);
      break;
    case 'y':
      keywords = Object.keys(VERTICAL_CONVERSIONS);
      break;
  }
  if (keywords.length) {
    allowed.push(`keywords (${keywords.join(', ')})`);
  }

  // Add "or" before the last item
  allowed[allowed.length - 1] = `or ${allowed[allowed.length - 1]}`;

  return allowed.join(', ');
}

export const ERROR_MESSAGES = {
  invalidTransformOrigin: (value: TransformOrigin) =>
    `Invalid transformOrigin: ${JSON.stringify(value)}. Expected 1-3 values.`,
  invalidValue: (
    value: string | number,
    axis: Axis,
    origin: TransformOrigin,
    isArray: boolean
  ) =>
    `Invalid value "${value}" for the ${axis}-axis in transformOrigin ${JSON.stringify(
      origin
    )}. Allowed values: ${getAllowedValues(axis, isArray)}.`,
};

function maybeSwapComponents(components: (string | number)[]) {
  if (
    components[0] in VERTICAL_CONVERSIONS &&
    (components[1] === undefined || components[1] in HORIZONTAL_CONVERSIONS)
  ) {
    [components[0], components[1]] = [components[1], components[0]];
  }
}

function parseValue(
  value: string | number,
  allowPercentages: boolean,
  customParse: CustomParse,
  getError: () => string,
  keywordConversions?: KeywordConversions
) {
  if (typeof value === 'number') {
    return value;
  }
  if (keywordConversions && value in keywordConversions) {
    return keywordConversions[value];
  }
  if (allowPercentages && value.endsWith('%')) {
    const num = parseFloat(value);
    if (num === 0) {
      return 0;
    }
    if (!isNaN(num)) {
      return `${num}%`;
    }
  }

  const parsed = customParse(value);
  if (parsed === null) {
    throw new ReanimatedError(getError());
  }

  return parsed;
}

function parsePx(component: string) {
  if (component.endsWith('px') || component === '0') {
    const num = parseFloat(component);
    if (!isNaN(num)) {
      return num;
    }
  }
  return null;
}

export const processTransformOrigin: ValueProcessor<TransformOrigin> = (
  value
) => {
  const isArray = Array.isArray(value);
  const components = isArray ? value : value.split(/\s+/);
  const customParse = isArray ? () => null : parsePx;

  if (components.length < 1 || components.length > 3) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidTransformOrigin(value));
  }

  maybeSwapComponents(components);

  return [
    parseValue(
      components[0] ?? '50%',
      true,
      customParse,
      () => ERROR_MESSAGES.invalidValue(components[0], 'x', value, isArray),
      HORIZONTAL_CONVERSIONS
    ),
    parseValue(
      components[1] ?? '50%',
      true,
      customParse,
      () => ERROR_MESSAGES.invalidValue(components[1], 'y', value, isArray),
      VERTICAL_CONVERSIONS
    ),
    parseValue(components[2] ?? 0, false, customParse, () =>
      ERROR_MESSAGES.invalidValue(components[2], 'z', value, isArray)
    ),
  ];
};
