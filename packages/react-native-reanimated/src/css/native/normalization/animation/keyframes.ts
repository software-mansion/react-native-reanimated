'use strict';
import type { NativePropsBuilder, UnknownRecord } from '../../../../common';
import {
  getPropsBuilder,
  getSeparatelyInterpolatedNestedProperties,
  isDefined,
} from '../../../../common';
import type {
  CSSAnimationKeyframes,
  CSSAnimationKeyframeSelector,
  CSSAnimationTimingFunction,
} from '../../../types';
import { offsetOf } from '../../../utils';
import type {
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSKeyframeTimingFunctions,
  PropsWithKeyframes,
} from '../../types';
import { normalizeTimingFunction } from '../common';

export const ERROR_MESSAGES = {
  invalidOffsetType: (selector: CSSAnimationKeyframeSelector) =>
    `Invalid keyframe selector "${selector}". Only numbers, percentages, "from", and "to" are supported.`,
  invalidOffsetRange: (selector: CSSAnimationKeyframeSelector) =>
    `Invalid keyframe selector "${selector}". Expected a number between 0 and 1 or a percentage between 0% and 100%.`,
};

export function normalizeKeyframeSelector(
  keyframeSelector: CSSAnimationKeyframeSelector
): number[] {
  const selectors =
    typeof keyframeSelector === 'string'
      ? keyframeSelector.split(',').map((k) => k.trim())
      : [keyframeSelector];

  return selectors.map((selector) => {
    const offset = offsetOf(selector);

    if (offset === null) {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidOffsetType(selector)}`
      );
    }
    if (offset < 0 || offset > 1) {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidOffsetRange(selector)}`
      );
    }

    return offset;
  });
}

type ProcessedKeyframes = Array<{
  offset: number;
  props: UnknownRecord;
  timingFunction?: CSSAnimationTimingFunction;
}>;

export function processKeyframes(
  keyframes: CSSAnimationKeyframes,
  propsBuilder: NativePropsBuilder
): ProcessedKeyframes {
  return Object.entries(keyframes)
    .flatMap(
      ([selector, { animationTimingFunction = undefined, ...props } = {}]) => {
        const normalizedProps = propsBuilder.build(props);
        if (!normalizedProps) {
          return [];
        }
        return normalizeKeyframeSelector(selector).map((offset) => ({
          offset,
          props: normalizedProps,
          ...(animationTimingFunction && {
            timingFunction: animationTimingFunction,
          }),
        }));
      }
    )
    .sort((a, b) => a.offset - b.offset)
    .reduce<ProcessedKeyframes>((acc, keyframe) => {
      const lastKeyframe = acc[acc.length - 1];
      if (lastKeyframe && lastKeyframe.offset === keyframe.offset) {
        lastKeyframe.props = { ...lastKeyframe.props, ...keyframe.props };
        lastKeyframe.timingFunction = keyframe.timingFunction;
      } else {
        acc.push(keyframe);
      }
      return acc;
    }, []);
}

type KeyframeLeafEntries = Array<{ offset: number; value: unknown }>;

function processProps(
  offset: number,
  props: object,
  keyframeProps: UnknownRecord,
  separatelyInterpolatedNestedProperties: ReadonlySet<string>
) {
  for (const [property, value] of Object.entries(props)) {
    if (!isDefined(value)) {
      continue;
    }

    if (
      /* this object type check is correct as it accepts records and arrays */
      typeof value === 'object' &&
      separatelyInterpolatedNestedProperties.has(property)
    ) {
      const subBuilder = (keyframeProps[property] ??= Array.isArray(value)
        ? []
        : {}) as UnknownRecord;
      processProps(
        offset,
        value,
        subBuilder,
        separatelyInterpolatedNestedProperties
      );
      continue;
    }

    const entries = (keyframeProps[property] ??= []) as KeyframeLeafEntries;
    entries.push({ offset, value });
  }
}

export function normalizeAnimationKeyframes(
  keyframes: CSSAnimationKeyframes,
  compoundComponentName: string
): NormalizedCSSAnimationKeyframesConfig {
  const propsBuilder = getPropsBuilder(compoundComponentName);
  const separatelyInterpolatedNestedProperties =
    getSeparatelyInterpolatedNestedProperties(compoundComponentName);
  const propKeyframes: PropsWithKeyframes = {};
  const timingFunctions: NormalizedCSSKeyframeTimingFunctions = {};

  processKeyframes(keyframes, propsBuilder).forEach(
    ({ offset, props, timingFunction }) => {
      processProps(
        offset,
        props,
        propKeyframes,
        separatelyInterpolatedNestedProperties
      );
      if (timingFunction && offset < 1) {
        timingFunctions[offset] = normalizeTimingFunction(timingFunction);
      }
    }
  );

  return { propKeyframes, keyframeTimingFunctions: timingFunctions };
}
