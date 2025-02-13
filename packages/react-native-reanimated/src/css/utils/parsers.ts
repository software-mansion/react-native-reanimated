'use strict';
import type { BoxShadowValue } from 'react-native';

import { isLength, isTimeUnit, smellsLikeTimingFunction } from './guards';
import { ReanimatedError } from '../errors';
import { SingleCSSTransitionConfig } from '../types';

const LENGTH_MAPPINGS = [
  'offsetX',
  'offsetY',
  'blurRadius',
  'spreadDistance',
] as const;

const SHADOW_PARTS_REGEX = /(?:[^\s()]+|\([^()]*\))+/g;
const SHADOW_SPLIT_REGEX = /(?:[^,()]+|\([^)]*\))+(?=\s*,|$)/g;

export function parseBoxShadowString(value: string) {
  if (value === 'none') {
    return [];
  }

  const shadows = value.match(SHADOW_SPLIT_REGEX) || [];

  return shadows.map<BoxShadowValue>((shadow) => {
    const result: BoxShadowValue = {
      offsetX: 0,
      offsetY: 0,
    };

    let foundLengthsCount = 0;
    const parts = shadow.match(SHADOW_PARTS_REGEX) || [];

    parts.forEach((part) => {
      if (isLength(part)) {
        result[LENGTH_MAPPINGS[foundLengthsCount++]] = part;
      } else if (part === 'inset') {
        result.inset = true;
      } else {
        result.color = part.trim();
      }
    });

    return result;
  });
}

export function splitByComma(str: string) {
  // split by comma not enclosed in parentheses
  const parts: string[] = [];
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

export function splitByWhitespace(str: string) {
  // split by whitespace not enclosed in parentheses
  return str.split(/\s+(?![^()]*\))/);
}

type ParsedShorthandSingleTransitionConfig = Omit<
  SingleCSSTransitionConfig,
  'transitionProperty' | 'transitionTimingFunction'
> & {
  transitionProperty?: string;
  transitionTimingFunction?: string;
};

export function parseSingleTransitionShorthand(
  value: string
): ParsedShorthandSingleTransitionConfig {
  const result: ParsedShorthandSingleTransitionConfig = {};
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
    if (
      result.transitionTimingFunction === undefined &&
      smellsLikeTimingFunction(part)
    ) {
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
