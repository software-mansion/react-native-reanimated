'use strict';
'worklet';
import type { DropShadowValue, FilterFunction } from 'react-native';

import { ReanimatedError } from '../../errors';
import type {
  FilterArray,
  ParsedDropShadow,
  ParsedFilterFunction,
  ValueProcessor,
  ValueProcessorContext,
} from '../../types';
import { isLength, isNumber } from '../../utils/guards';
import { processColor } from './colors';

// Capture filter functions and their content eg "brightness(0.5) opacity(1)" => [["brightness(0.5)", "brightness", "0.5"], ["opacity(1)", "opacity", "1"]]
const FILTER_REGEX = /([\w-]+)\(([^()]*|\([^()]*\)|[^()]*\([^()]*\)[^()]*)\)/g;
// Capture two groups: current transform value and optional unit -> "21.37px" => ["21.37px", "21.37", "px"] + accepts scientific notation like 'e-14'
const FILTER_VALUE_REGEX = /^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)([a-z%]*)$/;
// Capture drop-shadow parts "10px 5px 5px #888888" => ["10px", "5px", "5px", "#888888"]
const DROP_SHADOW_REGEX = /[^,\s()]+(?:\([^()]*\))?/g;

export const ERROR_MESSAGES = {
  invalidFilter: (filter: string) => `Invalid filter property: ${filter}`,
  invalidFilterType: (filter: readonly FilterFunction[]) =>
    `Invalid filter input type: ${typeof filter}. Expected string or array.`,
};

type SingleFilterValue = {
  numberValue: number;
  unit: string;
};

const parseHueRotate = (value: SingleFilterValue): number | undefined => {
  const { numberValue, unit } = value;
  if (numberValue === 0) {
    return 0;
  }
  if (unit !== 'deg' && unit !== 'rad') {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidFilter(`hueRotate(${numberValue}${unit})`)
    );
  }
  return unit === 'rad' ? (180 * numberValue) / Math.PI : numberValue;
};

const parseBlur = (value: SingleFilterValue): number | undefined => {
  const { numberValue, unit } = value;
  if ((unit && unit !== 'px') || numberValue < 0) {
    return undefined;
  }
  return numberValue;
};

const parsePercentageFilter = (
  value: SingleFilterValue
): number | undefined => {
  const { numberValue, unit } = value;
  if ((unit && unit !== '%') || numberValue < 0) {
    return undefined;
  }
  return unit === '%' ? numberValue / 100 : numberValue;
};

const LENGTH_MAPPINGS = ['offsetX', 'offsetY', 'standardDeviation'] as const;

const parseDropShadowString = (value: string) => {
  const match = value.match(DROP_SHADOW_REGEX) ?? [];
  const result: DropShadowValue = { offsetX: 0, offsetY: 0 };
  let foundLengthsCount = 0;

  match.forEach((part) => {
    if (isLength(part)) {
      if (__DEV__ && !part.trim().match(FILTER_VALUE_REGEX)) {
        throw new ReanimatedError(
          ERROR_MESSAGES.invalidFilter(`dropShadow(${value})`)
        );
      }
      result[LENGTH_MAPPINGS[foundLengthsCount++]] = parseFloat(part);
    } else {
      result.color = part.trim();
    }
  });

  return result;
};

const parseDropShadow = (
  value: string | DropShadowValue,
  context: ValueProcessorContext | undefined
): ParsedDropShadow | null => {
  const dropShadow =
    typeof value === 'string' ? parseDropShadowString(value) : value;
  const {
    color = '#000',
    offsetX = 0,
    offsetY = 0,
    standardDeviation = 0,
  } = dropShadow;

  const parsedStdDev = parseFloat(standardDeviation as string);
  if (parsedStdDev < 0) {
    return null;
  }

  const processedColor = processColor(color, context);
  if (processedColor == null) {
    return null;
  }

  return {
    // TODO - add support for IOS dynamic colors in CSS (for now we just assume that it's a number)
    color: processedColor as number,
    offsetX: parseFloat(offsetX as string),
    offsetY: parseFloat(offsetY as string),
    standardDeviation: parsedStdDev,
  };
};

const parseFilterProperty = (
  filterName: string,
  filterValue: string | number | DropShadowValue,
  context: ValueProcessorContext | undefined
): ParsedFilterFunction | null => {
  // We need to handle dropShadow separately because of its complex structure
  if (filterName == 'dropShadow') {
    const dropShadow = parseDropShadow(
      filterValue as string | DropShadowValue,
      context
    );
    if (dropShadow == null) {
      return null;
    }
    return { dropShadow };
  }

  let numberValue: number;
  let unit: string;

  if (isNumber(filterValue)) {
    numberValue = filterValue;
    unit = '';
  } else {
    const stringValue = filterValue as string;
    const match = stringValue.match(FILTER_VALUE_REGEX);
    if (!match) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidFilter(`${filterName}(${stringValue})`)
      );
    }
    numberValue = parseFloat(match[1]);
    unit = match[2];
  }

  let amount: number | undefined;
  switch (filterName) {
    case 'hueRotate':
      return { hueRotate: parseHueRotate({ numberValue, unit }) };
    case 'blur':
      amount = parseBlur({ numberValue, unit });
      break;
    case 'brightness':
    case 'contrast':
    case 'grayscale':
    case 'invert':
    case 'opacity':
    case 'saturate':
    case 'sepia':
      amount = parsePercentageFilter({ numberValue, unit });
      break;
    default:
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidFilter(`${filterName}(${numberValue}${unit})`)
      );
  }

  if (amount == null) {
    return null;
  }

  return { [filterName]: amount };
};

const parseFilterString = (
  value: string,
  context: ValueProcessorContext | undefined
): FilterArray => {
  const matches = Array.from(value.matchAll(FILTER_REGEX));

  if (matches.length === 0) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(value));
  }

  const filterArray: FilterArray = [];
  for (const match of matches) {
    const [filter, name, content] = match;
    if (!name || !content) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidFilter(filter));
    }

    const parsed = parseFilterProperty(name, content, context);
    if (parsed == null) {
      return [];
    }
    filterArray.push(parsed);
  }
  return filterArray;
};

export const processFilter: ValueProcessor<
  ReadonlyArray<FilterFunction> | string,
  FilterArray
> = (value, context) => {
  if (typeof value === 'string') {
    return parseFilterString(value, context);
  }

  if (Array.isArray(value)) {
    const filterArray: FilterArray = [];
    for (const filter of value) {
      const filterKey = Object.keys(filter)[0];
      const parsed = parseFilterProperty(filterKey, filter[filterKey], context);
      if (parsed == null) {
        return [];
      }
      filterArray.push(parsed);
    }
    return filterArray;
  }

  throw new ReanimatedError(ERROR_MESSAGES.invalidFilterType(value));
};
