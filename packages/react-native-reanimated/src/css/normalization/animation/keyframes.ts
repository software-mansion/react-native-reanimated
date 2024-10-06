'use strict';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReanimatedError } from '../../../errors';
import type { ViewStyle } from 'react-native';
import type {
  CSSKeyframeValue,
  CSSAnimationKeyframes,
  CSSKeyframeViewStyle,
  TransformsArray,
} from '../../types';
import { parseTransformString, isColorProp } from '../../utils';
import { normalizeKeyframesOffsets } from './base';
import { processCSSAnimationColor } from '../../../Colors';

const ERROR_MESSAGES = {
  unsupportedKeyframeValueType: (prop: string) =>
    `[Reanimated] Unsupported keyframe value type for "${prop}". Expected an array only for "transform".`,
  unsupportedColorFormat: (value: any, prop: string) =>
    `[Reanimated] Unsupported color format "${value}" for "${prop}".`,
};

type TemporaryTransforms = {
  transforms: Record<string, CSSKeyframeValue<any>>;
  previousTransformOffset: number;
};

export function processKeyframes(
  keyframes: CSSAnimationKeyframes
): CSSKeyframeViewStyle {
  const normalizedKeyframes = normalizeKeyframesOffsets(keyframes);

  const keyframeStyle: CSSKeyframeViewStyle = {};
  const temporaryTransforms: TemporaryTransforms = {
    transforms: {},
    previousTransformOffset: -1,
  };

  normalizedKeyframes.forEach(({ offset, style }) => {
    if (style) {
      processStyleProperties(offset, style, keyframeStyle, temporaryTransforms);
    }
  });

  addFormattedTransforms(keyframeStyle, temporaryTransforms.transforms);

  return keyframeStyle;
}

function processStyleProperties(
  offset: number,
  style: ViewStyle,
  keyframeStyle: CSSKeyframeViewStyle,
  temporaryTransforms: TemporaryTransforms
) {
  Object.entries(style).forEach(([property, value]) => {
    if (value === undefined) {
      return;
    }

    const prop = property as keyof ViewStyle;

    if (typeof value === 'object') {
      handleObjectValue(
        offset,
        prop,
        value,
        keyframeStyle,
        temporaryTransforms
      );
    } else if (typeof value === 'string' && prop === 'transform') {
      handleTransformString(offset, value, temporaryTransforms);
    } else {
      handlePrimitiveValue(offset, prop, value, keyframeStyle);
    }
  });
}

function handleObjectValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframeStyle: CSSKeyframeViewStyle,
  temporaryTransforms: TemporaryTransforms
) {
  if (Array.isArray(value)) {
    if (prop !== 'transform') {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedKeyframeValueType(prop)
      );
    }
    addTransformValues(temporaryTransforms, value, offset);
  } else {
    const subStyle = keyframeStyle[prop] || {};
    Object.entries(value).forEach(([subProperty, subValue]) => {
      if (subValue !== undefined) {
        addSubPropertyValue(subStyle, subProperty, subValue, offset);
      }
    });
    (keyframeStyle[prop] as typeof subStyle) = subStyle;
  }
}

function handleTransformString(
  offset: number,
  value: string,
  temporaryTransforms: TemporaryTransforms
) {
  const transformArray = parseTransformString(value);
  addTransformValues(temporaryTransforms, transformArray, offset);
}

function addTransformValues(
  temporaryTransforms: TemporaryTransforms,
  transforms: TransformsArray,
  offset: number
) {
  const currentTransformProperties = new Set(
    transforms.flatMap((transform) => Object.keys(transform))
  );

  // Reset transforms of properties that were updated in previous keyframes
  // but aren't present in the current keyframe
  Object.entries(temporaryTransforms.transforms).forEach(
    ([property, keyframes]) => {
      if (
        !currentTransformProperties.has(property) &&
        keyframes[keyframes.length - 1]?.value !== undefined
      ) {
        keyframes.push({ offset, value: undefined });
      }
    }
  );

  transforms.forEach((transform) => {
    Object.entries(transform).forEach(([property, value]) => {
      if (!temporaryTransforms.transforms[property]) {
        temporaryTransforms.transforms[property] = [];
      }
      const keyframes = temporaryTransforms.transforms[property];
      const lastKeyframe = keyframes[keyframes.length - 1];

      if (
        temporaryTransforms.previousTransformOffset !== -1 &&
        lastKeyframe?.offset !== temporaryTransforms.previousTransformOffset
      ) {
        keyframes.push({
          offset: temporaryTransforms.previousTransformOffset,
          value: undefined,
        });
      }

      keyframes.push({ offset, value });
    });
  });

  temporaryTransforms.previousTransformOffset = offset;
}

function handlePrimitiveValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframeStyle: CSSKeyframeViewStyle
) {
  if (!keyframeStyle[prop]) {
    (keyframeStyle as any)[prop] = [];
  }

  let processedValue = value;
  if (isColorProp(prop, value)) {
    processedValue = processCSSAnimationColor(value);
    if (!processedValue) {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedColorFormat(value, prop)
      );
    }
  }

  (keyframeStyle[prop] as any[]).push({ offset, value: processedValue });
}

function addSubPropertyValue(
  subStyle: Record<string, any>,
  subProperty: string,
  subValue: any,
  offset: number
) {
  if (!subStyle[subProperty]) {
    subStyle[subProperty] = [];
  }
  subStyle[subProperty].push({ offset, value: subValue });
}

function addFormattedTransforms(
  keyframeStyle: CSSKeyframeViewStyle,
  transforms: TemporaryTransforms['transforms']
) {
  const entries = Object.entries(transforms);
  if (entries.length > 0) {
    keyframeStyle.transform = entries.map(([property, keyframeValue]) => ({
      [property]: keyframeValue.reduce((acc, keyframe, idx) => {
        if (
          // Add keyframe only if the next and the previous keyframes have different values
          (keyframeValue[idx - 1]?.value !== keyframe.value ||
            keyframeValue[idx + 1]?.value !== keyframe.value) &&
          // If the keyframe has no value, add it only if it is not the first or the last keyframe
          // (these are added automatically in CPP)
          (keyframe.value !== undefined ||
            (keyframe.offset !== 0 && keyframe.offset !== 1))
        ) {
          acc.push(keyframe);
        }

        return acc;
      }, [] as CSSKeyframeValue<any>),
    })) as any;
  }
}
