'use strict';
import { ReanimatedError } from '../../../../errors';
import type {
  ConvertValuesToArraysWithUndefined,
  CSSTransitionProperties,
  SingleCSSTransitionConfig,
} from '../../../../types';
import {
  camelizeKebabCase,
  isTimeUnit,
  smellsLikeTimingFunction,
  splitByComma,
  splitByWhitespace,
} from '../../../../utils';
import { parseTimingFunction } from '../common';

export type ExpandedCSSTransitionConfigProperties = Required<
  ConvertValuesToArraysWithUndefined<
    Omit<CSSTransitionProperties, 'transition' | 'transitionProperty'>
  >
> & {
  transitionProperty: string[];
};

export function parseCSSTransitionShorthand(value: string) {
  return splitByComma(value).reduce<ExpandedCSSTransitionConfigProperties>(
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
      result.transitionTimingFunction = parseTimingFunction(part);
      continue;
    }
    if (result.transitionProperty === undefined) {
      result.transitionProperty = camelizeKebabCase(part);
      continue;
    }
    throw new ReanimatedError(`Invalid transition shorthand: ${value}`);
  }

  return result;
}
