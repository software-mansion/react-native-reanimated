'use strict';
'worklet';

import { ReanimatedError } from "../errors.js";
const HORIZONTAL_CONVERSIONS = {
  left: 0,
  center: '50%',
  right: '100%'
};
const VERTICAL_CONVERSIONS = {
  top: 0,
  center: '50%',
  bottom: '100%'
};
function getAllowedValues(axis, isArray) {
  const allowed = [];
  if (isArray) {
    allowed.push('numbers');
  } else {
    allowed.push('numbers with px unit');
  }
  allowed.push('percentages');
  let keywords = [];
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
  invalidTransformOrigin: value => `Invalid transformOrigin: ${JSON.stringify(value)}. Expected 1-3 values.`,
  invalidValue: (value, axis, origin, isArray) => `Invalid value "${value}" for the ${axis}-axis in transformOrigin ${JSON.stringify(origin)}. Allowed values: ${getAllowedValues(axis, isArray)}.`
};
function maybeSwapComponents(components) {
  if (components[0] in VERTICAL_CONVERSIONS && (components[1] === undefined || components[1] in HORIZONTAL_CONVERSIONS)) {
    [components[0], components[1]] = [components[1], components[0]];
  }
}
function parseValue(value, allowPercentages, customParse, getError, keywordConversions) {
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
function parsePx(component) {
  if (component.endsWith('px') || component === '0') {
    const num = parseFloat(component);
    if (!isNaN(num)) {
      return num;
    }
  }
  return null;
}
export const processTransformOrigin = value => {
  const isArray = Array.isArray(value);
  const components = isArray ? value : value.split(/\s+/);
  const customParse = isArray ? () => null : parsePx;
  if (components.length < 1 || components.length > 3) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidTransformOrigin(value));
  }
  maybeSwapComponents(components);
  return [parseValue(components[0] ?? '50%', true, customParse, () => ERROR_MESSAGES.invalidValue(components[0], 'x', value, isArray), HORIZONTAL_CONVERSIONS), parseValue(components[1] ?? '50%', true, customParse, () => ERROR_MESSAGES.invalidValue(components[1], 'y', value, isArray), VERTICAL_CONVERSIONS), parseValue(components[2] ?? 0, false, customParse, () => ERROR_MESSAGES.invalidValue(components[2], 'z', value, isArray))];
};
//# sourceMappingURL=transformOrigin.js.map