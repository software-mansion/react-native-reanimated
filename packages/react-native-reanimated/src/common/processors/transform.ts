'use strict';
'worklet';
import { ReanimatedError } from '../errors';

type TransformObject =
  | { matrix: number[] }
  | { perspective: number }
  | { rotate: string }
  | { rotateX: string }
  | { rotateY: string }
  | { rotateZ: string }
  | { scale: number }
  | { scaleX: number }
  | { scaleY: number }
  | { translateX: number }
  | { translateY: number }
  | { skewX: string }
  | { skewY: string }
  | Record<string, any>;

// According to RN documentation, these transforms need to have string values with units
// https://reactnative.dev/docs/transforms#transform
const STRING_UNIT_TRANSFORMS = new Set([
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
]);

const TRANSFORM_REGEX = /(\w+)\(([^)]+)\)/g;
// Capture two groups: current transform value and optional unit -> "21.37px" => ["21.37px", "21.37", "px"]
const TRANSFORM_VALUE_REGEX = /^([-+]?\d*\.?\d+)([a-z%]*)$/g;

const VALID_UNITS = ['px', 'deg', 'rad', '%'] as const;

const ERROR_MESSAGES = {
  invalidTransform: (value: any) =>
    `Invalid transform: ${JSON.stringify(value)}. Expected minimum one value.`,
  invalidTransformValue: (value: any) =>
    `Invalid transform value: ${JSON.stringify(value)}. Check if it contains value name, numerical value, and unit (px or deg) where applicable.`,
  invalidUnit: (transform: string, unit: string) =>
    `Invalid unit "${unit}" in ${JSON.stringify(
      transform
    )}. Supported units: ${VALID_UNITS.join(', ')}.`,
};

const parseNumberWithUnit = (name: string, value: string) => {
  const match = value.match(TRANSFORM_VALUE_REGEX);
  if (!match) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidTransformValue(value));
  }
  const number = parseFloat(match[1]);
  const unit = match[2];

  const needsStringUnit = STRING_UNIT_TRANSFORMS.has(name);
  return needsStringUnit ? `${number}${unit || 'deg'}` : number;
};

export const parseTransformString = (value: string): TransformObject[] => {
  const matches = Array.from(value.matchAll(TRANSFORM_REGEX));

  if (matches.length === 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidTransform(value));
  }

  const transformArray = matches.map((match) => {
    const [_, name, content] = match;
    if (!name || !content) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidTransformValue(match[0]));
    }

    if (name === 'matrix') {
      const matrixValues = content.split(',').map((v) => parseFloat(v.trim()));
      return { matrix: matrixValues };
    }

    const finalValue = parseNumberWithUnit(name, content);
    return { [name]: finalValue };
  });

  return transformArray;
};

export const processTransform = (value: any) => {
  if (typeof value === 'string') {
    return parseTransformString(value);
  }

  if (Array.isArray(value)) {
    return value;
  }

  throw new ReanimatedError(
    `Invalid transform input type: ${typeof value}. Expected string or array.`
  );
};
