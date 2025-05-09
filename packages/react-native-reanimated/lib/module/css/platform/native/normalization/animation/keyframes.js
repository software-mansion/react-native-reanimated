'use strict';

import { PERCENTAGE_REGEX } from "../../../../constants/index.js";
import { ReanimatedError } from "../../../../errors.js";
import { isDefined, isNumber } from "../../../../utils/index.js";
import { SEPARATELY_INTERPOLATED_ARRAY_PROPERTIES } from "../../config.js";
import styleBuilder from "../../styleBuilder.js";
import { normalizeTimingFunction } from "../common/index.js";
export const ERROR_MESSAGES = {
  invalidOffsetType: selector => `Invalid keyframe selector "${selector}". Only numbers, percentages, "from", and "to" are supported.`,
  invalidOffsetRange: selector => `Invalid keyframe selector "${selector}". Expected a number between 0 and 1 or a percentage between 0% and 100%.`
};
function normalizeKeyframeSelector(keyframeSelector) {
  const selectors = typeof keyframeSelector === 'string' ? keyframeSelector.split(',').map(k => k.trim()) : [keyframeSelector];
  const offsets = selectors.map(selector => {
    if (selector === 'from') {
      return 0;
    }
    if (selector === 'to') {
      return 1;
    }
    let offset;
    if (typeof selector === 'number' || !isNaN(+selector)) {
      offset = +selector;
    } else if (PERCENTAGE_REGEX.test(selector)) {
      offset = parseFloat(selector) / 100;
    }
    if (!isNumber(offset)) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidOffsetType(selector));
    }
    if (offset < 0 || offset > 1) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(selector));
    }
    return offset;
  });
  return offsets;
}
function processKeyframes(keyframes) {
  return Object.entries(keyframes).flatMap(([selector, {
    animationTimingFunction = undefined,
    ...style
  } = {}]) => {
    const normalizedStyle = styleBuilder.buildFrom(style);
    if (!normalizedStyle) {
      return [];
    }
    return normalizeKeyframeSelector(selector).map(offset => ({
      offset,
      style: normalizedStyle,
      timingFunction: animationTimingFunction
    }));
  }).sort((a, b) => a.offset - b.offset).reduce((acc, keyframe) => {
    const lastKeyframe = acc[acc.length - 1];
    if (lastKeyframe && lastKeyframe.offset === keyframe.offset) {
      lastKeyframe.style = {
        ...lastKeyframe.style,
        ...keyframe.style
      };
      lastKeyframe.timingFunction = keyframe.timingFunction;
    } else {
      acc.push(keyframe);
    }
    return acc;
  }, []);
}
function processStyleProperties(offset, style, keyframeStyle) {
  Object.entries(style).forEach(([property, value]) => {
    if (!isDefined(value)) {
      return;
    }
    if (typeof value === 'object') {
      if (!Array.isArray(value) || SEPARATELY_INTERPOLATED_ARRAY_PROPERTIES.has(property)) {
        if (!keyframeStyle[property]) {
          keyframeStyle[property] = Array.isArray(value) ? [] : {};
        }
        processStyleProperties(offset, value, keyframeStyle[property]);
        return;
      }
    }
    if (!keyframeStyle[property]) {
      keyframeStyle[property] = [];
    }
    keyframeStyle[property].push({
      offset,
      value
    });
  });
}
export function normalizeAnimationKeyframes(keyframes) {
  const keyframesStyle = {};
  const timingFunctions = {};
  processKeyframes(keyframes).forEach(({
    offset,
    style,
    timingFunction
  }) => {
    processStyleProperties(offset, style, keyframesStyle);
    if (timingFunction && offset < 1) {
      timingFunctions[offset] = normalizeTimingFunction(timingFunction);
    }
  });
  return {
    keyframesStyle,
    keyframeTimingFunctions: timingFunctions
  };
}
//# sourceMappingURL=keyframes.js.map