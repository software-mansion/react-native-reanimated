'use strict';
import { ReanimatedError } from '../../../../common';
import type { ControlPoint, CSSTimingFunction } from '../../../easing';
import { cubicBezier, linear, steps } from '../../../easing';
import type {
  ConvertValuesToArraysWithUndefined,
  CSSTransitionProperties,
} from '../../../types';
import {
  camelizeKebabCase,
  isArrayOfLength,
  isPercentage,
  isPredefinedTimingFunction,
  isStepsModifier,
  parseSingleTransitionShorthand,
  splitByComma,
  splitByWhitespace,
} from '../../../utils';

export type ExpandedCSSTransitionConfigProperties = Required<
  ConvertValuesToArraysWithUndefined<
    Omit<CSSTransitionProperties, 'transition' | 'transitionProperty'>
  >
> & {
  transitionProperty: string[];
};

export const createEmptyTransitionConfig =
  (): ExpandedCSSTransitionConfigProperties => ({
    transitionProperty: [],
    transitionDuration: [],
    transitionTimingFunction: [],
    transitionDelay: [],
    transitionBehavior: [],
  });

export function parseTransitionShorthand(value: string) {
  return splitByComma(value).reduce<ExpandedCSSTransitionConfigProperties>(
    (acc, part) => {
      const result = parseSingleTransitionShorthand(part);
      acc.transitionProperty.push(
        camelizeKebabCase(result.transitionProperty ?? 'all')
      );
      acc.transitionDuration.push(result.transitionDuration);
      acc.transitionTimingFunction.push(
        result.transitionTimingFunction
          ? parseTimingFunction(result.transitionTimingFunction)
          : undefined
      );
      acc.transitionDelay.push(result.transitionDelay);
      acc.transitionBehavior.push(result.transitionBehavior);
      return acc;
    },
    createEmptyTransitionConfig()
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
