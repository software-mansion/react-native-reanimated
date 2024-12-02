'use strict';
import type {
  CSSAnimationKeyframeSelector,
  CSSAnimationKeyframes,
  AnyRecord,
  CSSAnimationTimingFunction,
  NormalizedCSSKeyframesStyle,
  NormalizedCSSAnimationName,
  NormalizedCSSKeyframeTimingFunctions,
} from '../../types';
import { isNumber } from '../../utils';
import { OFFSET_REGEX } from './constants';
import { normalizeStyle, normalizeTimingFunction } from '../common';
import type { StyleProps } from '../../../commonTypes';
import { ReanimatedError } from '../../errors';

export const ERROR_MESSAGES = {
  invalidOffsetType: (selector: CSSAnimationKeyframeSelector) =>
    `Invalid keyframe selector "${selector}". Only numbers, percentages, "from", and "to" are supported.`,
  invalidOffsetRange: (selector: CSSAnimationKeyframeSelector) =>
    `Invalid keyframe selector "${selector}". Expected a number between 0 and 1 or a percentage between 0% and 100%.`,
};

function normalizeKeyframeSelector(
  keyframeSelector: CSSAnimationKeyframeSelector
): number[] {
  const selectors =
    typeof keyframeSelector === 'string'
      ? keyframeSelector.split(',').map((k) => k.trim())
      : [keyframeSelector];

  const offsets = selectors.map((selector) => {
    if (selector === 'from') {
      return 0;
    }
    if (selector === 'to') {
      return 1;
    }

    let offset: number | undefined;

    if (typeof selector === 'number' || !isNaN(+selector)) {
      offset = +selector;
    } else if (OFFSET_REGEX.test(selector)) {
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

function normalizeKeyframes(keyframes: CSSAnimationKeyframes) {
  return Object.entries(keyframes)
    .flatMap(
      ([selector, { animationTimingFunction = undefined, ...style } = {}]) =>
        normalizeKeyframeSelector(selector).map((offset) => ({
          offset,
          style: normalizeStyle(style),
          timingFunction: animationTimingFunction,
        }))
    )
    .sort((a, b) => a.offset - b.offset)
    .reduce(
      (acc, keyframe) => {
        const lastKeyframe = acc[acc.length - 1];
        if (lastKeyframe && lastKeyframe.offset === keyframe.offset) {
          lastKeyframe.style = { ...lastKeyframe.style, ...keyframe.style };
          lastKeyframe.timingFunction = keyframe.timingFunction;
        } else {
          acc.push(keyframe);
        }
        return acc;
      },
      [] as Array<{
        offset: number;
        style: StyleProps;
        timingFunction?: CSSAnimationTimingFunction;
      }>
    );
}

function processStyleProperties<S extends AnyRecord>(
  offset: number,
  style: S,
  keyframeStyle: AnyRecord
) {
  Object.entries(style).forEach(([property, value]) => {
    if (value === undefined) {
      return;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      if (!keyframeStyle[property]) {
        keyframeStyle[property] = {};
      }
      processStyleProperties(offset, value, keyframeStyle[property]);
    } else {
      if (!keyframeStyle[property]) {
        keyframeStyle[property] = [];
      }
      keyframeStyle[property].push({ offset, value });
    }
  });
}

export function normalizeAnimationName(
  keyframes: CSSAnimationKeyframes
): NormalizedCSSAnimationName {
  const keyframesStyle: NormalizedCSSKeyframesStyle = {};
  const timingFunctions: NormalizedCSSKeyframeTimingFunctions = {};

  normalizeKeyframes(keyframes).forEach(({ offset, style, timingFunction }) => {
    processStyleProperties(offset, style, keyframesStyle);
    if (timingFunction && offset < 1) {
      timingFunctions[offset] = normalizeTimingFunction(timingFunction);
    }
  });

  return { keyframesStyle, keyframeTimingFunctions: timingFunctions };
}
