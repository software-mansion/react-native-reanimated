/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ViewStyle } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationDirection,
  CSSAnimationTimeUnit,
  CSSAnimationIterationCount,
  CSSAnimationKeyframes,
  CSSAnimationTimingFunction,
  CSSKeyframeKey,
  KeyframedValue,
  KeyframedViewStyle,
  NormalizedCSSAnimationConfig,
  NormalizedOffsetKeyframe,
} from './types';
import { ReanimatedError } from '../errors';
import { processCSSAnimationColor } from '../Colors';

const VALID_ANIMATION_DIRECTIONS = [
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
] as const;

export const ERROR_MESSAGES = {
  invalidDelay: (timeUnit: any) =>
    `[Reanimated] Invalid delay "${timeUnit}". Expected a number, "ms", or "s".`,
  invalidDuration: (duration: any) =>
    `[Reanimated] Invalid duration "${duration}". Expected a number, "ms", or "s".`,
  negativeDuration: (duration: any) =>
    `[Reanimated] Duration cannot be negative, received "${duration}".`,
  unsupportedKeyframe: (key: any) =>
    `[Reanimated] Unsupported keyframe "${key}". Expected a number or percentage.`,
  invalidOffsetRange: (key: any) =>
    `[Reanimated] Keyframe offset should be between 0 and 100% (0-1). Received "${key}".`,
  unsupportedKeyframeValueType: (prop: string) =>
    `[Reanimated] Unsupported keyframe value type for "${prop}". Expected an array only for "transform".`,
  unsupportedAnimationDirection: (direction: any) =>
    `[Reanimated] Unsupported animation direction "${direction}". Supported directions: ${VALID_ANIMATION_DIRECTIONS.join(
      ', '
    )}.`,
  invalidIterationCount: `[Reanimated] Invalid iteration count. Expected a number or "infinite".`,
  negativeIterationCount: `[Reanimated] Iteration count cannot be negative.`,
  unsupportedTimingFunction: (timingFunction: any) =>
    `[Reanimated] Unsupported timing function "${timingFunction}". Supported functions: linear, ease-in-out-back.`,
  invalidAnimationName: (animationName: any) =>
    `[Reanimated] Invalid animation "${animationName}". Expected an object containing keyframes.`,
  unsupportedColorFormat: (value: any, prop: string) =>
    `[Reanimated] Unsupported color format ${value} for ${prop} in CSS animation`,
};

function normalizeTimeUnit(timeUnit: CSSAnimationTimeUnit): number | null {
  if (typeof timeUnit === 'number') {
    return timeUnit;
  } else if (timeUnit?.endsWith('ms')) {
    return parseInt(timeUnit, 10);
  } else if (timeUnit?.endsWith('s')) {
    return parseFloat(timeUnit) * 1000;
  }
  return null;
}

function normalizeDelay(delay: CSSAnimationTimeUnit = 0): number {
  const delayMs = normalizeTimeUnit(delay);
  if (delayMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDelay(delay));
  }
  return delayMs;
}

export function normalizeDuration(duration: CSSAnimationTimeUnit = 0): number {
  const durationMs = normalizeTimeUnit(duration);
  if (durationMs === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidDuration(duration));
  } else if (durationMs < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeDuration(durationMs));
  }
  return durationMs;
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
        ERROR_MESSAGES.unsupportedKeyframeValueType(prop)
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

  let processedValue = value;
  if (
    prop.toLowerCase().includes('color') &&
    (typeof value === 'string' || typeof value === 'number')
  ) {
    processedValue = processCSSAnimationColor(value);
    if (!processedValue) {
      throw new ReanimatedError(
        ERROR_MESSAGES.unsupportedColorFormat(value, prop)
      );
    }
  }

  (keyframedStyle[prop] as any[]).push({ offset, value: processedValue });
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

function normalizeDirection(
  direction: CSSAnimationDirection = 'normal'
): CSSAnimationDirection {
  if (!VALID_ANIMATION_DIRECTIONS.includes(direction)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.unsupportedAnimationDirection(direction)
    );
  }
  return direction;
}

function normalizeIterationCount(
  iterationCount: CSSAnimationIterationCount = 1
): number {
  if (iterationCount === 'infinite') {
    return -1;
  } else if (!isNumber(iterationCount)) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidIterationCount);
  } else if (iterationCount < 0) {
    throw new ReanimatedError(ERROR_MESSAGES.negativeIterationCount);
  }
  return iterationCount;
}

const VALID_TIMING_FUNCTIONS = ['linear', 'ease-in-out-back'] as const;

function normalizeTimingFunction(
  timingFunction: CSSAnimationTimingFunction = 'linear'
): CSSAnimationTimingFunction {
  if (!VALID_TIMING_FUNCTIONS.includes(timingFunction)) {
    throw new ReanimatedError(
      ERROR_MESSAGES.unsupportedTimingFunction(timingFunction)
    );
  }
  return timingFunction;
}

export function normalizeConfig({
  animationName,
  animationDuration,
  animationDelay,
  animationTimingFunction,
  animationIterationCount,
  animationDirection,
}: CSSAnimationConfig): NormalizedCSSAnimationConfig {
  if (!animationName || typeof animationName !== 'object') {
    throw new ReanimatedError(
      ERROR_MESSAGES.invalidAnimationName(animationName)
    );
  }

  return {
    animationName: createKeyframedStyle(animationName),
    animationDuration: normalizeDuration(animationDuration),
    animationTimingFunction: normalizeTimingFunction(animationTimingFunction),
    animationDelay: normalizeDelay(animationDelay),
    animationIterationCount: normalizeIterationCount(animationIterationCount),
    animationDirection: normalizeDirection(animationDirection),
  };
}
