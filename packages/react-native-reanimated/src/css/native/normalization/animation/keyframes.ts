'use strict';
import type {
  AnyRecord,
  NativePropsBuilder,
  UnknownRecord,
} from '../../../../common';
import {
  getPropsBuilder,
  getSeparatelyInterpolatedNestedProperties,
  isDefined,
  isNumber,
  isRecord,
  ReanimatedError,
} from '../../../../common';
import { PERCENTAGE_REGEX } from '../../../constants';
import type {
  CSSAnimationKeyframes,
  CSSAnimationKeyframeSelector,
  CSSAnimationTimingFunction,
} from '../../../types';
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

function processProps(
  offset: number,
  props: UnknownRecord,
  keyframeProps: AnyRecord,
  separatelyInterpolatedNestedProperties: ReadonlySet<string>
) {
  Object.entries(props).forEach(([property, value]) => {
    if (!isDefined(value)) {
      return;
    }

    if (
      isRecord(value) &&
      separatelyInterpolatedNestedProperties.has(property)
    ) {
      if (!keyframeProps[property]) {
        keyframeProps[property] = Array.isArray(value) ? [] : {};
      }
      processProps(
        offset,
        value,
        keyframeProps[property],
        separatelyInterpolatedNestedProperties
      );
      return;
    }

    if (!keyframeProps[property]) {
      keyframeProps[property] = [];
    }
    keyframeProps[property].push({ offset, value });
  });
}

export function normalizeAnimationKeyframes(
  keyframes: CSSAnimationKeyframes,
  reactViewName: string
): NormalizedCSSAnimationKeyframesConfig {
  const propsBuilder = getPropsBuilder(reactViewName);
  const separatelyInterpolatedNestedProperties =
    getSeparatelyInterpolatedNestedProperties(reactViewName);
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
