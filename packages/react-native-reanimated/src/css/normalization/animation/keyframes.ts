'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationKeyframeOffset,
  CSSAnimationKeyframes,
  CSSKeyframeStyleProps,
  NormalizedCSSAnimationKeyframe,
  AnyRecord,
} from '../../types';
import { isNumber } from '../../utils';
import { OFFSET_REGEX } from './constants';
import { normalizeStyle } from '../common';

export const ERROR_MESSAGES = {
  invalidOffsetType: (key: CSSAnimationKeyframeOffset) =>
    `Invalid keyframe offset type "${key}". Only numbers, percentages, "from", and "to" are supported.`,
  invalidOffsetRange: (key: CSSAnimationKeyframeOffset) =>
    `Invalid keyframe offset range "${key}". Expected a number between 0 and 1 or a percentage between 0% and 100%.`,
};

function normalizeOffset(key: CSSAnimationKeyframeOffset): number[] {
  const keys =
    typeof key === 'string' ? key.split(',').map((k) => k.trim()) : [key];

  const offsets = keys.map((singleKey) => {
    if (singleKey === 'from') {
      return 0;
    }
    if (singleKey === 'to') {
      return 1;
    }

    let offset: number | undefined;

    if (typeof singleKey === 'number' || !isNaN(+singleKey)) {
      offset = +singleKey;
    } else if (OFFSET_REGEX.test(singleKey)) {
      offset = parseFloat(singleKey) / 100;
    }

    if (!isNumber(offset)) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidOffsetType(singleKey));
    }
    if (offset < 0 || offset > 1) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(singleKey));
    }

    return offset;
  });

  return offsets;
}
function normalizeKeyframes(
  keyframes: CSSAnimationKeyframes
): Array<NormalizedCSSAnimationKeyframe> {
  return Object.entries(keyframes)
    .flatMap(([key, style = {}]) =>
      normalizeOffset(key).map((offset) => ({
        offset,
        style: normalizeStyle(style),
      }))
    )
    .sort((a, b) => a.offset - b.offset)
    .reduce((acc, keyframe) => {
      const lastKeyframe = acc[acc.length - 1];
      if (lastKeyframe && lastKeyframe.offset === keyframe.offset) {
        lastKeyframe.style = { ...lastKeyframe.style, ...keyframe.style };
      } else {
        acc.push(keyframe);
      }
      return acc;
    }, [] as Array<NormalizedCSSAnimationKeyframe>);
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

export function createKeyframeStyle(
  keyframes: CSSAnimationKeyframes
): CSSKeyframeStyleProps {
  const keyframeStyle: CSSKeyframeStyleProps = {};

  normalizeKeyframes(keyframes).forEach(({ offset, style }) =>
    processStyleProperties(offset, style, keyframeStyle)
  );

  return keyframeStyle;
}
