'use strict';
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ViewStyle } from 'react-native';
import { ReanimatedError } from '../../../errors';
import type {
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

export function processKeyframes(
  keyframes: CSSAnimationKeyframes
): CSSKeyframeViewStyle {
  const normalizedKeyframes = normalizeKeyframesOffsets(keyframes);

  const keyframeStyle: CSSKeyframeViewStyle = {};

  normalizedKeyframes.forEach(({ offset, style }) => {
    if (style) {
      processStyleProperties(offset, style, keyframeStyle);
    }
  });

  return keyframeStyle;
}

function processStyleProperties(
  offset: number,
  style: ViewStyle,
  keyframeStyle: CSSKeyframeViewStyle
) {
  Object.entries(style).forEach(([property, value]) => {
    if (value === undefined) {
      return;
    }

    const prop = property as keyof ViewStyle;

    if (typeof value === 'object') {
      handleObjectValue(offset, prop, value, keyframeStyle);
    } else if (typeof value === 'string' && prop === 'transform') {
      handleTransformsString(offset, value, keyframeStyle);
    } else {
      handlePrimitiveValue(offset, prop, value, keyframeStyle);
    }
  });
}

function handleObjectValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframeStyle: CSSKeyframeViewStyle
) {
  if (Array.isArray(value)) {
    if (prop !== 'transform') {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedKeyframeValueType(prop)
      );
    }
    addTransformValues(offset, value, keyframeStyle);
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

function handleTransformsString(
  offset: number,
  value: string,
  keyframeStyle: CSSKeyframeViewStyle
) {
  const transformArray = parseTransformString(value);
  addTransformValues(offset, transformArray, keyframeStyle);
}

function addTransformValues(
  offset: number,
  transforms: TransformsArray,
  keyframeStyle: CSSKeyframeViewStyle
) {
  if (!keyframeStyle.transform) {
    keyframeStyle.transform = [];
  }
  (keyframeStyle.transform as any[]).push({
    offset,
    value: transforms,
  });
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
