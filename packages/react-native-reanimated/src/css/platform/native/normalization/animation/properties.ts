'use strict';
import type {
  AnyRecord,
  CSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../../../types';
import { convertPropertyToArray } from '../../../../utils';
import type { ExpandedCSSAnimationConfigProperties } from './shorthand';
import {
  createEmptyAnimationConfig,
  parseAnimationShorthand,
} from './shorthand';

function getExpandedConfigProperties(
  config: CSSAnimationProperties
): ExpandedCSSAnimationConfigProperties {
  const result: AnyRecord = config.animation
    ? parseAnimationShorthand(config.animation)
    : createEmptyAnimationConfig();

  for (const [key, value] of Object.entries(config)) {
    result[key] = convertPropertyToArray(value);
  }

  return result as ExpandedCSSAnimationConfigProperties;
}

export function createSingleCSSAnimationProperties(
  properties: CSSAnimationProperties
): SingleCSSAnimationProperties[] {
  const {
    animationName,
    animationDuration,
    animationTimingFunction,
    animationDelay,
    animationIterationCount,
    animationDirection,
    animationFillMode,
    animationPlayState,
  } = getExpandedConfigProperties(properties);
  const result: SingleCSSAnimationProperties[] = [];

  for (let i = 0; i < animationName.length; i++) {
    const keyframes = animationName[i];
    if (!keyframes || keyframes === 'none') {
      continue;
    }

    result.push({
      animationName: keyframes,
      animationDuration: animationDuration?.[i % animationDuration.length],
      animationTimingFunction:
        animationTimingFunction?.[i % animationTimingFunction.length],
      animationDelay: animationDelay?.[i % animationDelay.length],
      animationIterationCount:
        animationIterationCount?.[i % animationIterationCount.length],
      animationDirection: animationDirection?.[i % animationDirection.length],
      animationFillMode: animationFillMode?.[i % animationFillMode.length],
      animationPlayState: animationPlayState?.[i % animationPlayState.length],
    });
  }

  return result;
}
