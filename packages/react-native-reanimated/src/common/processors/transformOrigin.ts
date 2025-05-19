'use strict';
'worklet';
import type { TransformOrigin, ValueProcessor } from '../types';

type Axis = 'x' | 'y' | 'z';
type ConvertedValue = `${number}%` | number;
type KeywordConversions = Record<string, ConvertedValue>;
type CustomParse = (value: string) => ConvertedValue | null;

function getAllowedValues(axis: Axis, isArray: boolean): string {
  const keywords =
    axis === 'x'
      ? Object.keys(HORIZONTAL_CONVERSIONS)
      : axis === 'y'
        ? Object.keys(VERTICAL_CONVERSIONS)
        : [];

  return `numbers${isArray ? '' : ' with px unit'}, percentages${keywords.length ? `, or keywords (${keywords.join(', ')})` : ''}`;
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
  keywordConversions: KeywordConversions,
  customParse: CustomParse,
  getError: () => string
) {
  if (typeof value === 'number') {
    return value;
  }
  if (keywordConversions && value in keywordConversions) {
    return keywordConversions[value];
  }
  if (value.endsWith('%')) {
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
      HORIZONTAL_CONVERSIONS,
      customParse,
      () => ERROR_MESSAGES.invalidValue(components[0], 'x', value, isArray)
    ),
    parseValue(components[1] ?? '50%', VERTICAL_CONVERSIONS, customParse, () =>
      ERROR_MESSAGES.invalidValue(components[1], 'y', value, isArray)
    ),
    parseValue(components[2] ?? 0, {}, customParse, () =>
      ERROR_MESSAGES.invalidValue(components[2], 'z', value, isArray)
    ),
  ];
};
