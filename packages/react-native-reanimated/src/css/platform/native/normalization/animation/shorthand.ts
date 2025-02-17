'use strict';
import type {
  ConvertValuesToArraysWithUndefined,
  CSSAnimationProperties,
} from '../../../../types';
import { parseSingleAnimationShorthand, splitByComma } from '../../../../utils';
import { parseTimingFunction } from '../common';

export type ExpandedCSSAnimationConfigProperties = Required<
  ConvertValuesToArraysWithUndefined<Omit<CSSAnimationProperties, 'animation'>>
>;

export const createEmptyAnimationConfig =
  (): ExpandedCSSAnimationConfigProperties => ({
    animationName: [],
    animationDuration: [],
    animationTimingFunction: [],
    animationDelay: [],
    animationIterationCount: [],
    animationDirection: [],
    animationFillMode: [],
    animationPlayState: [],
  });

export function parseAnimationShorthand(value: string) {
  return splitByComma(value).reduce<ExpandedCSSAnimationConfigProperties>(
    (acc, part) => {
      const result = parseSingleAnimationShorthand(part);
      if (!result.animationName) {
        // Skipping invalid animation shorthand without animation name
        return acc;
      }

      acc.animationName.push(result.animationName);
      acc.animationDuration.push(result.animationDuration);
      acc.animationTimingFunction.push(
        result.animationTimingFunction
          ? parseTimingFunction(result.animationTimingFunction)
          : undefined
      );
      acc.animationDelay.push(result.animationDelay);
      acc.animationIterationCount.push(result.animationIterationCount);
      acc.animationDirection.push(result.animationDirection);
      acc.animationFillMode.push(result.animationFillMode);
      acc.animationPlayState.push(result.animationPlayState);
      return acc;
    },
    createEmptyAnimationConfig()
  );
}
