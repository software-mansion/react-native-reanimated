'use strict';
import { ReanimatedError } from '../../../errors';
import type {
  CSSAnimationDirection,
  CSSAnimationFillMode,
  CSSAnimationKeyframeKey,
  CSSAnimationIterationCount,
  CSSAnimationKeyframes,
  NormalizedCSSAnimationKeyframe,
} from '../../types';
import { isNumber } from '../../utils';
import {
  OFFSET_REGEX,
  VALID_ANIMATION_DIRECTIONS,
  VALID_FILL_MODES,
} from './constants';

const ERROR_MESSAGES = {
  unsupportedKeyframe: (key: CSSAnimationKeyframeKey) =>
    `[Reanimated] Unsupported keyframe "${key}". Only numbers, "from", and "to" are supported.`,
  invalidOffsetRange: (key: CSSAnimationKeyframeKey) =>
    `[Reanimated] Invalid keyframe offset "${key}". Expected a number between 0 and 1.`,
  unsupportedAnimationDirection: (direction: CSSAnimationDirection) =>
    `[Reanimated] Unsupported animation direction "${direction}".`,
  invalidIterationCount: (iterationCount: CSSAnimationIterationCount) =>
    `[Reanimated] Invalid iteration count "${iterationCount}". Expected a number or "infinite".`,
  negativeIterationCount: (iterationCount: number) =>
    `[Reanimated] Iteration count cannot be negative, received "${iterationCount}".`,
  unsupportedFillMode: (fillMode: CSSAnimationFillMode) =>
    `[Reanimated] Unsupported fill mode "${fillMode}".`,
};

export function normalizeOffset(key: CSSAnimationKeyframeKey): number {
  if (key === 'from') {
    return 0;
  }
  if (key === 'to') {
    return 1;
  }

  let offset: number | undefined;
  if (typeof key === 'number' || !isNaN(+key)) {
    offset = +key;
  } else if (OFFSET_REGEX.test(key)) {
    offset = parseFloat(key) / 100;
  }

  if (!isNumber(offset)) {
    throw new ReanimatedError(ERROR_MESSAGES.unsupportedKeyframe(key));
  }
  if (offset < 0 || offset > 1) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidOffsetRange(key));
  }

  return offset;
}

export function normalizeKeyframesOffsets(
  keyframes: CSSAnimationKeyframes
): Array<NormalizedCSSAnimationKeyframe> {
  return Object.entries(keyframes)
    .map(([key, style = {}]) => ({
      offset: normalizeOffset(key as CSSAnimationKeyframeKey),
      style,
    }))
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

export function normalizeDirection(
  direction: CSSAnimationDirection = 'normal'
): CSSAnimationDirection {
  if (!VALID_ANIMATION_DIRECTIONS.has(direction)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.unsupportedAnimationDirection(direction)
    );
  }
  return direction;
}

export function normalizeIterationCount(
  iterationCount: CSSAnimationIterationCount = 1
): number {
  if (iterationCount === 'infinite') {
    return -1;
  } else if (!isNumber(iterationCount)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidIterationCount(iterationCount)
    );
  } else if (iterationCount < 0) {
    throw new ReanimatedError(
      ERROR_MESSAGES.negativeIterationCount(iterationCount)
    );
  }
  return iterationCount;
}

export function normalizeFillMode(
  fillMode: CSSAnimationFillMode = 'none'
): CSSAnimationFillMode {
  if (!VALID_FILL_MODES.has(fillMode)) {
    throw new ReanimatedError(ERROR_MESSAGES.unsupportedFillMode(fillMode));
  }
  return fillMode;
}
