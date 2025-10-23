'worklet';
'use strict';
import type { FilterFunction } from 'react-native';

import { ReanimatedError } from '../../errors';
import type {
  ValueProcessor,
  FilterArray,
  ParsedDropShadow,
} from '../../types';

// both
// brightness(num | %)
// opacity(num | %)

//android
// blur(num)
// contrast(num | %)
// grayscale(num | %)
// hueRotate(rad | deg)
// invert(num | %)
// saturate(num | %)
// sepia(num | %)

//dropShadow - this is more complex

const FILTER_REGEX = /(\w+)\(([^)]+)\)/g;
// Capture two groups: current transform value and optional unit -> "21.37px" => ["21.37px", "21.37", "px"]
const FILTER_VALUE_REGEX = /^([-+]?\d*\.?\d+)([a-z%]*)$/;
const DROP_SHADOW_REGEX = /([a-z-]+)\(([^)]+)\)/i;

export const ERROR_MESSAGES = {
  invalidFilter: (filter: string) => `Invalid filter property: ${filter}`,
};

type SingleFilterValue = {
  number: number;
  unit: string;
};

const parseHueRotate = (value: SingleFilterValue): number | undefined => {
  let { number, unit } = value;
  if (number === 0) {
    return 0;
  }
  if (unit !== 'deg' && unit !== 'rad') {
    return undefined;
  }
  return unit === 'rad' ? (180 * number) / Math.PI : number;
};

const parseBlur = (value: SingleFilterValue): number | undefined => {
  const { number, unit } = value;
  if ((unit && unit !== 'px') || number < 0) {
    return undefined;
  }
  return number;
};

const parseDropShadowString = (value: string) => {
  const match = value.match(DROP_SHADOW_REGEX);
  console.log('drop shadow match', match);
};
const parseDropShadow = (value: string): ParsedDropShadow | undefined => {
  const dropShadow =
    typeof value === 'string' ? parseDropShadowString(value) : value;
};

const parseFilterProperty = (
  filter: Array<string> | Record<string, string>
): FilterArray => {
  let key, valueString;
  if (!Array.isArray(filter)) {
    key = Object.keys(filter)[0];
    valueString = filter[key];
  } else {
    key = filter[1];
    valueString = filter[2];
    console.log('key, valueString', key, valueString);
  }

  if (key == 'dropShadow') {
    return { dropShadow: parseDropShadow(valueString) };
  }

  const value = valueString.match(FILTER_VALUE_REGEX);
  if (!value) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidFilter(`${key}(${valueString})`)
    );
  }
  let number = parseFloat(value[1]);
  const unit = value[2];

  switch (key) {
    case 'hueRotate':
      return { hueRotate: parseHueRotate({ number, unit }) };
    case 'blur':
      return { blur: parseBlur({ number, unit }) };
    case 'brightness':
    case 'contrast':
    case 'grayscale':
    case 'invert':
    case 'opacity':
    case 'saturate':
    case 'sepia':
      if ((unit && unit !== '%' && unit !== 'px') || number < 0) {
        return undefined;
      }
      if (unit === '%') {
        number /= 100;
      }
      return { [key]: number };
    default:
      return {};
  }
};

export const parseFilterString = (value: string) => {
  const matches = Array.from(value.matchAll(FILTER_REGEX));

  if (matches.length === 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(value));
  }

  const filterArray = matches.map((match) => {
    const [_, name, content] = match;
    if (!name || !content) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(match[0]));
    }

    console.log('name, content', name, content);
    return parseFilterProperty(match);
  });
  console.log('filterArray', filterArray);
  return filterArray;
};

export const processFilter: ValueProcessor<
  ReadonlyArray<FilterFunction> | string
> = (value) => {
  if (typeof value === 'string') {
    return parseFilterString(value);
  }

  console.log(value);
  if (Array.isArray(value)) {
    return value.map((filter) => parseFilterProperty(filter));
  }

  throw new ReanimatedError(
    `Invalid transform input type: ${typeof value}. Expected string or array.`
  );
};
