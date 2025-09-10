'use strict';

import { ReanimatedError } from "../../common/index.js";
import { isTimeUnit, smellsLikeTimingFunction } from "./guards.js";
export function splitByComma(str) {
  // split by comma not enclosed in parentheses
  const parts = [];
  let current = '';
  let depth = 0;
  for (const char of str) {
    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}
export function splitByWhitespace(str) {
  // split by whitespace not enclosed in parentheses
  return str.split(/\s+(?![^()]*\))/);
}
export function parseSingleTransitionShorthand(value) {
  const result = {};
  const parts = splitByWhitespace(value);
  for (const part of parts) {
    if (part === 'all') {
      result.transitionProperty = 'all';
      continue;
    }
    if (part === 'normal' || part === 'allow-discrete') {
      result.transitionBehavior = part;
      continue;
    }
    if (isTimeUnit(part)) {
      const timeUnit = part;
      if (result.transitionDuration === undefined) {
        result.transitionDuration = timeUnit;
        continue;
      }
      if (result.transitionDelay === undefined) {
        result.transitionDelay = timeUnit;
        continue;
      }
    }
    if (result.transitionTimingFunction === undefined && smellsLikeTimingFunction(part)) {
      result.transitionTimingFunction = part;
      continue;
    }
    if (result.transitionProperty === undefined) {
      result.transitionProperty = part;
      continue;
    }
    throw new ReanimatedError(`Invalid transition shorthand: ${value}`);
  }
  return result;
}
//# sourceMappingURL=parsers.js.map