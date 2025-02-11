'use strict';
import type { ControlPoint, CSSTimingFunction } from '../../../../easings';
import { cubicBezier, linear, steps } from '../../../../easings';
import { ReanimatedError } from '../../../../errors';
import {
  isArrayOfLength,
  isPercentage,
  isPredefinedTimingFunction,
  isStepsModifier,
  splitByComma,
  splitByWhitespace,
} from '../../../../utils';

function asControlPoint(value: string[]): ControlPoint | null {
  const [first, ...rest] = value;
  if (!first || isNaN(Number(first)) || !rest.every(isPercentage)) {
    return null;
  }
  return [Number(first), ...rest];
}

export function parseTimingFunction(value: string): CSSTimingFunction {
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
