'use strict';
import type { UnknownRecord } from '../../../../common';
import { processTransform } from '../../../../common';
import { CSSKeyframesRuleBase } from '../../../models';
import type {
  CSSAnimationKeyframes,
  ExistingCSSAnimationProperties,
  SingleCSSAnimationProperties,
} from '../../../types';
import { normalizeKeyframeSelector } from './keyframes';
import { createSingleCSSAnimationProperties } from './properties';
import { normalizeSingleCSSAnimationSettings } from './settings';

function getKeyframes(
  animationName: SingleCSSAnimationProperties['animationName']
): CSSAnimationKeyframes | null {
  if (animationName instanceof CSSKeyframesRuleBase) {
    return animationName.cssRules as CSSAnimationKeyframes;
  }
  if (animationName && typeof animationName === 'object') {
    return animationName as CSSAnimationKeyframes;
  }
  return null;
}

function collectKeyframeProps(
  keyframes: CSSAnimationKeyframes,
  offset: number,
  target: UnknownRecord
): boolean {
  let collected = false;
  for (const [selector, keyframe] of Object.entries(keyframes)) {
    if (!keyframe || !normalizeKeyframeSelector(selector).includes(offset)) {
      continue;
    }
    // Everything in a keyframe except its own timing function is a style value.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { animationTimingFunction, ...props } = keyframe;
    for (const key in props) {
      const value = (props as UnknownRecord)[key];
      // React Native parses transform strings with a stricter grammar than
      // the keyframes accept, so they are handed over already parsed.
      target[key] =
        key === 'transform' && typeof value === 'string'
          ? processTransform(value)
          : value;
      collected = true;
    }
  }
  return collected;
}

/**
 * The style the animations put on the view the moment they are registered,
 * before their first frame: the first keyframe of a run whose delay has
 * elapsed, or the backwards fill of a delayed one. Runs that start partway
 * through (negative delay) are left to the native side, which interpolates
 * them. Later animations override earlier ones, like on the web. Returns null
 * when nothing applies.
 */
export function getAnimationsStartingStyle(
  animationProperties: ExistingCSSAnimationProperties
): UnknownRecord | null {
  const result: UnknownRecord = {};
  let hasProps = false;

  for (const properties of createSingleCSSAnimationProperties(
    animationProperties
  )) {
    const keyframes = getKeyframes(properties.animationName);
    if (!keyframes) {
      continue;
    }

    const { delay, direction, duration, fillMode, iterationCount } =
      normalizeSingleCSSAnimationSettings(properties);
    if (delay < 0) {
      continue;
    }
    if (delay === 0 && (duration === 0 || iterationCount === 0)) {
      // Over before its first frame, so it never shows its first keyframe.
      continue;
    }
    const fillsBackwards = fillMode === 'backwards' || fillMode === 'both';
    if (delay > 0 && !fillsBackwards) {
      continue;
    }

    const startsReversed =
      direction === 'reverse' || direction === 'alternate-reverse';
    if (collectKeyframeProps(keyframes, startsReversed ? 1 : 0, result)) {
      hasProps = true;
    }
  }

  return hasProps ? result : null;
}
