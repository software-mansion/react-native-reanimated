'use strict';
import { convertConfigPropertiesToArrays } from '../../../../utils';
import type {
  CSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../../../types';

export function createSingleCSSAnimationProperties(
  properties: CSSAnimationProperties
): SingleCSSAnimationProperties[] {
  const {
    animationName: animationNames,
    animationDuration,
    animationTimingFunction,
    animationDelay,
    animationIterationCount,
    animationDirection,
    animationFillMode,
    animationPlayState,
  } = convertConfigPropertiesToArrays(properties);

  return animationNames.map((animationName, index) => {
    return {
      animationName,
      animationDuration: animationDuration?.[index % animationDuration.length],
      animationTimingFunction:
        animationTimingFunction?.[index % animationTimingFunction.length],
      animationDelay: animationDelay?.[index % animationDelay.length],
      animationIterationCount:
        animationIterationCount?.[index % animationIterationCount.length],
      animationDirection:
        animationDirection?.[index % animationDirection.length],
      animationFillMode: animationFillMode?.[index % animationFillMode.length],
      animationPlayState:
        animationPlayState?.[index % animationPlayState.length],
    };
  });
}
