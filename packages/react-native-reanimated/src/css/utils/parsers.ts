'use strict';
import type { BoxShadowValue } from 'react-native';

import { ReanimatedError } from '../errors';
import type {
  SingleCSSAnimationProperties,
  SingleCSSTransitionProperties,
} from '../types';
import {
  isAnimationName,
  isLength,
  isNumber,
  isTimeUnit,
  smellsLikeTimingFunction,
} from './guards';

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

export type ParsedShorthandSingleTransitionConfig = Omit<
  SingleCSSTransitionProperties,
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

type ParsedShorthandSingleAnimationConfig = Omit<
  SingleCSSAnimationProperties,
  'animationName' | 'animationTimingFunction'
> & {
  animationName?: string;
  animationTimingFunction?: string;
};

export function parseSingleAnimationShorthand(
  value: string
): ParsedShorthandSingleAnimationConfig {
  const result: ParsedShorthandSingleAnimationConfig = {};
  const parts = splitByWhitespace(value);

  for (const part of parts) {
    switch (part) {
      case 'normal':
      case 'reverse':
      case 'alternate':
      case 'alternate-reverse':
        result.animationDirection = part;
        continue;
      case 'none':
      case 'forwards':
      case 'backwards':
      case 'both':
        result.animationFillMode = part;
        continue;
      case 'infinite':
        result.animationIterationCount = part;
        continue;
      case 'running':
      case 'paused':
        result.animationPlayState = part;
        continue;
    }
    if (isTimeUnit(part)) {
      const timeUnit = part;
      if (result.animationDuration === undefined) {
        result.animationDuration = timeUnit;
        continue;
      }
      if (result.animationDelay === undefined) {
        result.animationDelay = timeUnit;
        continue;
      }
    }
    if (
      result.animationTimingFunction === undefined &&
      smellsLikeTimingFunction(part)
    ) {
      result.animationTimingFunction = part;
      continue;
    }
    if (result.animationIterationCount === undefined && isNumber(+part)) {
      result.animationIterationCount = parseFloat(part);
      continue;
    }
    if (result.animationName === undefined && isAnimationName(part)) {
      result.animationName = part;
      continue;
    }
    throw new ReanimatedError(`Invalid animation shorthand: ${value}`);
  }

  if (!result.animationName) {
    throw new ReanimatedError(`Invalid animation shorthand: ${value}`);
  }

  return result;
}
