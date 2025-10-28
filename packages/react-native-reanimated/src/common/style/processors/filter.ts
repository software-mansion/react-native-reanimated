'use strict';
'worklet';
import type { DropShadowValue, FilterFunction } from 'react-native';

import { ReanimatedError } from '../../errors';
import type {
  FilterArray,
  ParsedDropShadow,
  ValueProcessor,
} from '../../types';
import { isLength } from '../../utils/guards';
import { processColor } from './colors';

// Capture filter functions and their content eg "brightness(0.5) opacity(1)" => [["brightness(0.5)", "brightness", "0.5"], ["opacity(1)", "opacity", "1"]]
const FILTER_REGEX = /([\w-]+)\(([^()]*|\([^()]*\)|[^()]*\([^()]*\)[^()]*)\)/g;
// Capture two groups: current transform value and optional unit -> "21.37px" => ["21.37px", "21.37", "px"]
const FILTER_VALUE_REGEX = /^([-+]?\d*\.?\d+)([a-z%]*)$/;
// Capture drop-shadow parts "10px 5px 5px #888888" => ["10px", "5px", "5px", "#888888"]
const DROP_SHADOW_REGEX = /[^,\s()]+(?:\([^()]*\))?/g;

export const ERROR_MESSAGES = {
  invalidFilter: (filter: string) => `Invalid filter property: ${filter}`,
  invalidColor: (color: string, dropShadow: string) =>
    `Invalid color "${color}" in dropShadow "${dropShadow}".`,
};

type SingleFilterValue = {
  number: number;
  unit: string;
};

const parseHueRotate = (value: SingleFilterValue): number | undefined => {
  const { number, unit } = value;
  if (number === 0) {
    return 0;
  }
  if (unit !== 'deg' && unit !== 'rad') {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidFilter(`hueRotate(${number}${unit})`)
    );
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

const LENGTH_MAPPINGS = ['offsetX', 'offsetY', 'standardDeviation'] as const;

const parseDropShadowString = (value: string) => {
  const match = value.match(DROP_SHADOW_REGEX) ?? [];
  const result: DropShadowValue = { offsetX: 0, offsetY: 0 };
  let foundLengthsCount = 0;

  match.forEach((part) => {
    if (isLength(part) || !!parseFloat(part)) {
      const dropShadowValue = part.trim().match(FILTER_VALUE_REGEX);
      if (!dropShadowValue) {
        throw new ReanimatedError(
          ERROR_MESSAGES.invalidFilter(`dropShadow(${part})`)
        );
      }
      result[LENGTH_MAPPINGS[foundLengthsCount++]] = dropShadowValue[1];
    } else {
      result.color = part.trim();
    }
  });

  return result;
};
const parseDropShadow = (value: string | DropShadowValue): ParsedDropShadow => {
  const dropShadow =
    typeof value === 'string' ? parseDropShadowString(value) : value;
  const {
    color = '#000',
    offsetX = 0,
    offsetY = 0,
    standardDeviation = 0,
    ...rest
  } = dropShadow;

  const processedColor = processColor(color);

  if (processedColor === undefined || processedColor === null) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidColor(color as string, JSON.stringify(dropShadow))
    );
  }

  return {
    ...rest,
    color: processedColor,
    offsetX: parseFloat(offsetX as string),
    offsetY: parseFloat(offsetY as string),
    standardDeviation: parseFloat(standardDeviation as string),
  };
};

const parseFilterProperty = (
  filter: string[] | FilterFunction
): Record<string, ParsedDropShadow | number | undefined> => {
  let key, value;
  if (!Array.isArray(filter)) {
    key = Object.keys(filter)[0];
    value = (filter as Record<string, string>)[key];
  } else {
    key = filter[1];
    value = filter[2];
  }

  // We need to handle dropShadow separately because of its complex structure
  if (key == 'dropShadow') {
    return { dropShadow: parseDropShadow(value) };
  }

  const match = value.match(FILTER_VALUE_REGEX);
  if (!match) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(`${key}(${value})`));
  }

  let number = parseFloat(match[1]);
  const unit = match[2];

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
      // eslint-disable-next-line no-fallthrough
      if ((unit && unit !== '%') || number < 0) {
        return { [key]: undefined };
      }
      if (unit === '%') {
        number /= 100;
      }
      return { [key]: number };
    default:
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidFilter(`${key}(${value})`)
      );
  }
};

const parseFilterString = (value: string): FilterArray => {
  const matches = Array.from(value.matchAll(FILTER_REGEX));

  if (matches.length === 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(value));
  }

  const filterArray = matches.map((match) => {
    const [_, name, content] = match;
    if (!name || !content) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(match[0]));
    }

    return parseFilterProperty(match);
  });
  return filterArray as FilterArray;
};

export const processFilter: ValueProcessor<
  ReadonlyArray<FilterFunction> | string,
  FilterArray
> = (value) => {
  if (typeof value === 'string') {
    return parseFilterString(value);
  }

  if (Array.isArray(value)) {
    if (
      value.every(
        (filter) =>
          typeof filter === 'object' &&
          Object.values(filter).every((v) => typeof v === 'number')
      )
    ) {
      return value as FilterArray;
    }
    return value.map((filter) => parseFilterProperty(filter)) as FilterArray;
  }

  throw new ReanimatedError(
    `Invalid transform input type: ${typeof value}. Expected string or array.`
  );
};
