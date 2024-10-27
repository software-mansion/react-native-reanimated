'use strict';
import { ReanimatedError } from '../../../errors';
import type { NormalizedTransformOrigin, TransformOrigin } from '../../types';
import { isNumber } from '../../utils/typeGuards';

const HORIZONTAL_KEYWORDS: Record<string, string> = {
  left: '0%',
  center: '50%',
  right: '100%',
};

const VERTICAL_KEYWORDS: Record<string, string> = {
  top: '0%',
  center: '50%',
  bottom: '100%',
};

const ERROR_MESSAGES = {
  invalidTransformOrigin: (value: TransformOrigin) =>
    `Invalid transformOrigin value: ${JSON.stringify(value)}. Must have 1-3 values.`,
  invalidValueType: (value: string | number) =>
    `Invalid value: ${value}. Must be a number, percentage, or a valid keyword.`,
  invalidZOffset: (value: string | number) =>
    `Invalid z-offset value: ${value}. Must be a number.`,
};

export function normalizeTransformOrigin(
  transformOrigin: TransformOrigin
): NormalizedTransformOrigin {
  const valuesArray = Array.isArray(transformOrigin)
    ? transformOrigin
    : transformOrigin.split(' ');

  if (valuesArray.length > 3) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidTransformOrigin(transformOrigin)
    );
  }

  const [firstValue, secondValue, thirdValue] = valuesArray;
  const firstIsVertical = isVerticalKeyword(firstValue);

  return [
    resolveValue((firstIsVertical ? secondValue : firstValue) ?? '50%', false),
    resolveValue((firstIsVertical ? firstValue : secondValue) ?? '50%', true),
    validateNumber(thirdValue ?? 0),
  ];
}

function resolveValue(
  value: number | string,
  isVertical: boolean
): number | string {
  if (typeof value === 'number' || isNumber(+value) || value.endsWith('%')) {
    return value;
  }

  const conversions = isVertical ? VERTICAL_KEYWORDS : HORIZONTAL_KEYWORDS;
  const resolved = conversions[value];
  if (resolved !== undefined) {
    return resolved;
  }

  throw new ReanimatedError(ERROR_MESSAGES.invalidValueType(value));
}

function validateNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }
  throw new ReanimatedError(ERROR_MESSAGES.invalidZOffset(value));
}

function isVerticalKeyword(value: number | string): boolean {
  return typeof value === 'string' && value in VERTICAL_KEYWORDS;
}
