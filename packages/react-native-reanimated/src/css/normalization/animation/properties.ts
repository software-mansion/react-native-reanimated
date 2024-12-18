'use strict';
import type {
  ConvertValuesToArrays,
  CSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../types';

function convertConfigPropertiesToArrays(config: CSSAnimationProperties) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      return [key, Array.isArray(value) ? value : [value]];
    })
  ) as ConvertValuesToArrays<SingleCSSAnimationProperties>;
}

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
