/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ViewStyle } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationDuration,
  CSSAnimationKeyframes,
  CSSKeyframeKey,
  KeyframedValue,
  KeyframedViewStyle,
  NormalizedCSSAnimationConfig,
  NormalizedOffsetKeyframe,
} from './types';
import { ReanimatedError } from '../errors';

export const ERROR_MESSAGES = {
  unsupportedDuration: (duration: any) =>
    `[Reanimated] Unsupported duration ${duration} in CSS animation`,
  unsupportedKeyframe: (key: any) =>
    `[Reanimated] Unsupported keyframe ${key} in CSS animation`,
  invalidOffsetRange: (key: any) =>
    `[Reanimated] Keyframe offset should be in the range 0-100% (0-1), got ${key}`,
  unsupportedKeyframeValue: (value: any, prop: string) =>
    `[Reanimated] Unsupported keyframe value ${value.toString()} for ${prop} in CSS animation`,
};

export function normalizeDuration(duration: CSSAnimationDuration): number {
  if (typeof duration === 'number') {
    return duration;
  } else if (duration.endsWith('ms')) {
    return parseInt(duration, 10);
  } else if (duration.endsWith('s')) {
    return parseFloat(duration) * 1000;
  }
  throw new ReanimatedError(ERROR_MESSAGES.unsupportedDuration(duration));
}

const OFFSET_REGEX = /^-?\d+(\.\d+)?%$/;

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function normalizeOffset(key: CSSKeyframeKey): number {
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
): Array<NormalizedOffsetKeyframe> {
  return Object.entries(keyframes)
    .map(([key, style = {}]) => ({
      offset: normalizeOffset(key as CSSKeyframeKey),
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
    }, [] as Array<NormalizedOffsetKeyframe>);
}

export function createKeyframedStyle(
  keyframes: CSSAnimationKeyframes
): KeyframedViewStyle {
  const normalizedKeyframes = normalizeKeyframesOffsets(keyframes);

  const temporaryTransforms: Record<string, KeyframedValue<any>> = {};
  const keyframedStyle: KeyframedViewStyle = {};

  normalizedKeyframes.forEach(({ offset, style }) => {
    if (style) {
      processStyleProperties(
        offset,
        style,
        keyframedStyle,
        temporaryTransforms
      );
    }
  });

  addFormattedTransforms(keyframedStyle, temporaryTransforms);

  return keyframedStyle;
}

function processStyleProperties(
  offset: number,
  style: ViewStyle,
  keyframedStyle: KeyframedViewStyle,
  temporaryTransforms: Record<string, KeyframedValue<any>>
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
        keyframedStyle,
        temporaryTransforms
      );
    } else if (typeof value === 'string' && prop === 'transform') {
      handleTransformString(offset, value, temporaryTransforms);
    } else {
      handlePrimitiveValue(offset, prop, value, keyframedStyle);
    }
  });
}

export function handleObjectValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframedStyle: KeyframedViewStyle,
  temporaryTransforms: Record<string, KeyframedValue<any>>
) {
  if (Array.isArray(value)) {
    if (prop !== 'transform') {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedKeyframeValue(value, prop as string)
      );
    }
    addTransformValues(temporaryTransforms, value, offset);
  } else {
    const subStyle = keyframedStyle[prop] || {};
    Object.entries(value).forEach(([subProperty, subValue]) => {
      if (subValue !== undefined) {
        addSubPropertyValue(subStyle, subProperty, subValue, offset);
      }
    });
    (keyframedStyle[prop] as Record<string, any>) = subStyle;
  }
}

function handleTransformString(
  offset: number,
  value: string,
  temporaryTransforms: Record<string, KeyframedValue<any>>
) {
  const transformArray = parseTransformString(value);
  addTransformValues(temporaryTransforms, transformArray, offset);
}

function addTransformValues(
  temporaryTransforms: Record<string, KeyframedValue<any>>,
  transforms: Array<Record<string, any>>,
  offset: number
) {
  transforms.forEach((transform) => {
    Object.entries(transform).forEach(([transformKey, transformValue]) => {
      if (!temporaryTransforms[transformKey]) {
        temporaryTransforms[transformKey] = [];
      }
      temporaryTransforms[transformKey].push({
        offset,
        value: transformValue,
      });
    });
  });
}

export function handlePrimitiveValue(
  offset: number,
  prop: keyof ViewStyle,
  value: any,
  keyframedStyle: KeyframedViewStyle
) {
  if (!keyframedStyle[prop]) {
    (keyframedStyle as any)[prop] = [];
  }
  (keyframedStyle[prop] as any[]).push({ offset, value });
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
  keyframedStyle: KeyframedViewStyle,
  temporaryTransforms: Record<string, KeyframedValue<any>>
) {
  const transforms = Object.entries(temporaryTransforms);
  if (transforms.length > 0) {
    keyframedStyle.transform = transforms.map(([key, value]) => ({
      [key]: value,
    })) as any;
  }
}

export function parseTransformString(
  transformString: string
): Array<Record<string, any>> {
  return transformString
    .split(/\)\s*/)
    .filter(Boolean)
    .map((transform) => {
      const [key, value] = transform.split(/\(\s*/);
      return { [key]: isNaN(+value) ? value : +value };
    });
}

const VALID_TIMING_FUNCTIONS = ['linear', 'ease-in-out-back'] as const;

export function normalizeConfig(
  config: CSSAnimationConfig
): NormalizedCSSAnimationConfig {
  if (!VALID_TIMING_FUNCTIONS.includes(config.animationTimingFunction)) {
    throw new ReanimatedError(
      `Unsupported timing function ${config.animationTimingFunction} in CSS animation`
    );
  }

  return {
    animationDuration: normalizeDuration(config.animationDuration),
    animationTimingFunction: config.animationTimingFunction,
    animationName: createKeyframedStyle(config.animationName),
  };
}
