'use strict';
import { ReanimatedError } from '../../../../errors';
import type {
  ConvertValuesToArraysWithUndefined,
  CSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../../../types';
import {
  isAnimationName,
  isNumber,
  isTimeUnit,
  smellsLikeTimingFunction,
  splitByComma,
  splitByWhitespace,
} from '../../../../utils';
import { parseTimingFunction } from '../common';

export type ExpandedCSSAnimationConfigProperties = Required<
  ConvertValuesToArraysWithUndefined<
    Omit<CSSAnimationProperties, 'animation' | 'animationName'>
  >
> & {
  animationName: string[];
};

export function parseCSSAnimationShorthand(value: string) {
  return splitByComma(value).reduce<ExpandedCSSAnimationConfigProperties>(
    (acc, part) => {
      const result = parseSingleAnimationShorthand(part);
      if (!result.animationName) {
        // Skipping invalid animation shorthand without animation name
        return acc;
      }

      acc.animationName.push(result.animationName);
      acc.animationDuration.push(result.animationDuration);
      acc.animationTimingFunction.push(result.animationTimingFunction);
      acc.animationDelay.push(result.animationDelay);
      acc.animationIterationCount.push(result.animationIterationCount);
      acc.animationDirection.push(result.animationDirection);
      acc.animationFillMode.push(result.animationFillMode);
      acc.animationPlayState.push(result.animationPlayState);
      return acc;
    },
    {
      animationName: [],
      animationDuration: [],
      animationTimingFunction: [],
      animationDelay: [],
      animationIterationCount: [],
      animationDirection: [],
      animationFillMode: [],
      animationPlayState: [],
    }
  );
}

type ParsedShorthandSingleAnimationConfig = Omit<
  SingleCSSAnimationProperties,
  'animationName'
> & {
  animationName?: string;
};

function parseSingleAnimationShorthand(
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
      result.animationTimingFunction = parseTimingFunction(part);
      continue;
    }
    // TODO - improve this isNumber check here
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

  return result;
}
