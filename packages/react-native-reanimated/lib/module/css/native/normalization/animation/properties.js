'use strict';

import { convertPropertiesToArrays } from "../../../utils/index.js";
export function createSingleCSSAnimationProperties(properties) {
  const {
    animationName: animationNames,
    animationDuration,
    animationTimingFunction,
    animationDelay,
    animationIterationCount,
    animationDirection,
    animationFillMode,
    animationPlayState
  } = convertPropertiesToArrays(properties);
  return animationNames.map((animationName, index) => {
    return {
      animationName,
      animationDuration: animationDuration?.[index % animationDuration.length],
      animationTimingFunction: animationTimingFunction?.[index % animationTimingFunction.length],
      animationDelay: animationDelay?.[index % animationDelay.length],
      animationIterationCount: animationIterationCount?.[index % animationIterationCount.length],
      animationDirection: animationDirection?.[index % animationDirection.length],
      animationFillMode: animationFillMode?.[index % animationFillMode.length],
      animationPlayState: animationPlayState?.[index % animationPlayState.length]
    };
  });
}
//# sourceMappingURL=properties.js.map