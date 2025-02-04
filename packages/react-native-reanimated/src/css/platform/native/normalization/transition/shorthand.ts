'use strict';
import type { ControlPoint, CSSTimingFunction } from '../../../../easings';
import { cubicBezier, linear, steps } from '../../../../easings';
import { ReanimatedError } from '../../../../errors';
import type {
  ConvertValuesToArraysWithUndefined,
  CSSTransitionProperties,
  SingleCSSTransitionConfig,
} from '../../../../types';
import {
  camelizeKebabCase,
  isArrayOfLength,
  isPercentage,
  isPredefinedTimingFunction,
  isStepsModifier,
  isTimeUnit,
  VALID_PREDEFINED_TIMING_FUNCTIONS_SET,
} from '../../../../utils';

const VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET = new Set<string>([
  'cubic-bezier',
  'steps',
  'linear',
]);

export type ExpandedConfigProperties = Required<
  ConvertValuesToArraysWithUndefined<
    Omit<CSSTransitionProperties, 'transition' | 'transitionProperty'>
  >
> & {
  transitionProperty: string[];
};

export function parseTransitionShorthand(value: string) {
  return splitByComma(value).reduce<ExpandedConfigProperties>(
    (acc, part) => {
      const result = parseSingleTransitionShorthand(part);
      acc.transitionProperty.push(result.transitionProperty ?? 'all');
      acc.transitionDuration.push(result.transitionDuration);
      acc.transitionTimingFunction.push(result.transitionTimingFunction);
      acc.transitionDelay.push(result.transitionDelay);
      acc.transitionBehavior.push(result.transitionBehavior);
      return acc;
    },
    {
      transitionProperty: [],
      transitionDuration: [],
      transitionTimingFunction: [],
      transitionDelay: [],
      transitionBehavior: [],
    }
  );
}

type ParsedShorthandSingleTransitionConfig = Omit<
  SingleCSSTransitionConfig,
  'transitionProperty'
> & {
  transitionProperty?: string;
};

function parseSingleTransitionShorthand(
  value: string
): ParsedShorthandSingleTransitionConfig {
  const result: ParsedShorthandSingleTransitionConfig = {};
  const parts = splitByWhitespace(value);

  console.log(parts);
  for (const part of parts) {
    if (part === 'all') {
      console.log('>', part);

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
      result.transitionTimingFunction = parseTimingFunction(part);
      continue;
    }
    if (result.transitionProperty === undefined) {
      console.log('>', part);
      result.transitionProperty = camelizeKebabCase(part);
      continue;
    }
    throw new ReanimatedError(`Invalid transition shorthand: ${value}`);
  }

  return result;
}

function splitByComma(str: string) {
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

function splitByWhitespace(str: string) {
  // split by whitespace not enclosed in parentheses
  return str.split(/\s+(?![^()]*\))/);
}

function smellsLikeTimingFunction(value: string) {
  return (
    VALID_PREDEFINED_TIMING_FUNCTIONS_SET.has(value) ||
    VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET.has(value.split('(')[0].trim())
  );
}

function asControlPoint(value: string[]): ControlPoint | null {
  const [first, ...rest] = value;
  if (!first || isNaN(Number(first)) || !rest.every(isPercentage)) {
    return null;
  }
  return [Number(first), ...rest];
}

function parseTimingFunction(value: string): CSSTimingFunction {
  if (isPredefinedTimingFunction(value)) {
    return value;
  }

  // TODO: implement more strict check
  const regex = /^(.+)\((.+)\)$/;
  if (!regex.test(value)) {
    throw new ReanimatedError(`Unsupported timing function: ${value}`);
  }

  const [, name, args] = value.match(regex)!;
  const parsedArgs = splitByComma(args);

  switch (name) {
    case 'cubic-bezier': {
      const numberArgs = parsedArgs.map(Number);
      if (
        isArrayOfLength(numberArgs, 4) &&
        numberArgs.every((n) => !isNaN(n))
      ) {
        return cubicBezier(...numberArgs);
      }
      break;
    }
    case 'linear': {
      const controlPoints = parsedArgs.map((arg) => {
        const parts = splitByWhitespace(arg);
        const controlPoint = asControlPoint(parts);
        if (!controlPoint) {
          throw new ReanimatedError(
            `Invalid control point: ${arg} in ${value} timing function`
          );
        }
        return controlPoint;
      });
      return linear(...controlPoints);
    }
    case 'steps': {
      const stepsNumber = Number(parsedArgs[0]);
      const stepsModifier = parsedArgs[1];
      if (
        !isNaN(stepsNumber) &&
        stepsNumber > 0 &&
        (stepsModifier === undefined || isStepsModifier(stepsModifier))
      ) {
        return steps(stepsNumber, stepsModifier);
      }
      break;
    }
  }

  throw new ReanimatedError(`Invalid timing function: ${value}`);
}
