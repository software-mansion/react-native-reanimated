'use strict';
import type {
  ConvertValuesToArraysWithUndefined,
  CSSTransitionProperties,
} from '../../../../types';
import {
  parseSingleTransitionShorthand,
  splitByComma,
} from '../../../../utils';
import { parseTimingFunction } from '../common';

export type ExpandedCSSTransitionConfigProperties = Required<
  ConvertValuesToArraysWithUndefined<
    Omit<CSSTransitionProperties, 'transition' | 'transitionProperty'>
  >
> & {
  transitionProperty: string[];
};

export function parseTransitionShorthand(value: string) {
  return splitByComma(value).reduce<ExpandedCSSTransitionConfigProperties>(
    (acc, part) => {
      const result = parseSingleTransitionShorthand(part);
      acc.transitionProperty.push(result.transitionProperty ?? 'all');
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
    {
      transitionProperty: [],
      transitionDuration: [],
      transitionTimingFunction: [],
      transitionDelay: [],
      transitionBehavior: [],
    }
  );
}
